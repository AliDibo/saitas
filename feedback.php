<?php
/* ==========================================================================
   feedback.php – Öneri kutusu (geri bildirim) kayıt noktası
   Oyuncunun yazdığı öneri / talep, web kökünün DIŞINDAKİ bir klasöre
   kaydedilir: ~/saitas-geri-bildirim/oneriler.txt (cPanel → Dosya Yöneticisi).

   Güvenlik katmanları:
   1) Sadece GET (form jetonu almak) ve POST (göndermek); diğerleri 405.
   2) Aynı köken kontrolü (Origin / Sec-Fetch-Site) → başka siteden gönderilemez (CSRF).
   3) İmzalı, süreli form jetonu (HMAC): en az 3 sn önce alınmış, en fazla 2 saat geçerli.
   4) Bal küpü (honeypot) alanı: dolu gelirse sessizce yok sayılır (bot).
   5) Gövde boyutu en fazla 4 KB; mesaj 10–1000 karakter; en fazla 2 bağlantı;
      kontrol karakterleri atılır; aynı mesaj tekrar kaydedilmez.
   6) IP başına sınır: 10 dakikada 3, günde 10 mesaj. Toplam: günde 300 mesaj,
      dosya en fazla 5 MB. IP açık yazılmaz, gizli anahtarla özetlenir (KVKK).
   7) Kayıt JSON satırı olarak yazılır (kod olarak çalıştırılamaz), dosya kilitlenir.
   ========================================================================== */
declare(strict_types=1);

/* === Ayarlar ========================================================== */
const MSG_MIN = 10;              // en az karakter
const MSG_MAX = 1000;            // en fazla karakter
const BODY_MAX = 4096;           // istek gövdesi en fazla (bayt)
const MAX_LINKS = 2;             // mesajdaki en fazla bağlantı
const TOKEN_MIN_AGE = 3;         // jeton en erken kaç sn sonra kullanılabilir (bot hızı)
const TOKEN_MAX_AGE = 7200;      // jeton geçerlilik süresi (sn)
const LIMIT_SHORT = 3;           // IP başına 10 dakikada
const LIMIT_SHORT_WINDOW = 600;
const LIMIT_DAY = 10;            // IP başına 24 saatte
const LIMIT_GLOBAL_DAY = 300;    // tüm site, 24 saatte
const LOG_MAX_BYTES = 5242880;   // oneriler.txt en fazla 5 MB
const CATEGORIES = ['oneri', 'hata', 'kelime', 'diger'];
// Yeni mesajda e-posta bildirimi istersen adresini yaz (boş = sadece dosyaya kayıt)
const NOTIFY_EMAIL = '';

/* Kayıt klasörü: site klasörünün bir üstü (= $HOME) → web'den erişilemez */
define('STORE_DIR', dirname(__DIR__) . '/saitas-geri-bildirim');

/* === Yanıt ============================================================ */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: no-referrer');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");

function reply(int $status, array $data): void
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function fail(int $status, string $message): void
{
    reply($status, ['ok' => false, 'message' => $message]);
}

/* === Depolama ========================================================= */
function store_dir(): string
{
    if (!is_dir(STORE_DIR)) {
        if (!@mkdir(STORE_DIR, 0700, true) && !is_dir(STORE_DIR)) {
            error_log('[feedback] Klasor olusturulamadi: ' . STORE_DIR);
            fail(500, 'Şu an kaydedemiyoruz, biraz sonra tekrar dene.');
        }
        // Klasör bir gün yanlışlıkla web köküne taşınırsa bile okunamasın
        @file_put_contents(STORE_DIR . '/.htaccess', "Require all denied\n");
    }
    return STORE_DIR;
}

/** Gizli anahtar: ilk kullanımda rastgele üretilir, web kökü dışında durur. */
function secret_key(): string
{
    $file = store_dir() . '/.anahtar';
    $key = @file_get_contents($file);
    if (is_string($key) && strlen($key) === 64 && ctype_xdigit($key)) {
        return $key;
    }
    $key = bin2hex(random_bytes(32));
    if (@file_put_contents($file, $key, LOCK_EX) === false) {
        fail(500, 'Şu an kaydedemiyoruz, biraz sonra tekrar dene.');
    }
    @chmod($file, 0600);
    return $key;
}

/* === Aynı köken (CSRF) ================================================= */
function same_origin(): bool
{
    $site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
    if ($site !== '' && $site !== 'same-origin') {
        return false;
    }
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin === '') {
        // Eski tarayıcılar GET'te Origin göndermez; POST'ta zorunlu
        return ($_SERVER['REQUEST_METHOD'] ?? '') === 'GET';
    }
    $host = strtolower((string)($_SERVER['HTTP_HOST'] ?? ''));
    $parts = parse_url($origin);
    if (!is_array($parts) || empty($parts['host'])) {
        return false;
    }
    $originHost = strtolower($parts['host']) . (isset($parts['port']) ? ':' . $parts['port'] : '');
    return $host !== '' && hash_equals($host, $originHost);
}

/* === Jeton ============================================================ */
function make_token(string $key): string
{
    $payload = time() . '.' . bin2hex(random_bytes(8));
    return $payload . '.' . hash_hmac('sha256', $payload, $key);
}

function check_token(string $token, string $key): bool
{
    if (!preg_match('/^(\d{9,11})\.([0-9a-f]{16})\.([0-9a-f]{64})$/', $token, $m)) {
        return false;
    }
    $expected = hash_hmac('sha256', $m[1] . '.' . $m[2], $key);
    if (!hash_equals($expected, $m[3])) {
        return false;
    }
    $age = time() - (int)$m[1];
    return $age >= TOKEN_MIN_AGE && $age <= TOKEN_MAX_AGE;
}

/* === Mesaj temizliği =================================================== */
function clean_message(string $raw): string
{
    if (!mb_check_encoding($raw, 'UTF-8')) {
        return '';
    }
    $text = str_replace(["\r\n", "\r"], "\n", $raw);
    // Kontrol / görünmez yön karakterleri atılır (satır sonu hariç)
    $text = preg_replace('/[\x00-\x09\x0B-\x1F\x7F\x{200B}-\x{200F}\x{202A}-\x{202E}\x{2066}-\x{2069}\x{FEFF}]/u', '', $text);
    $text = preg_replace("/[ \t]+/u", ' ', (string)$text);
    $text = preg_replace("/\n{3,}/u", "\n\n", (string)$text);
    return trim((string)$text);
}

/* === Sınırlar (tek kilit altında) ======================================= */
/**
 * Hız sınırı + tekrar kontrolü + kayıt aynı kilit içinde yapılır
 * (aynı anda gelen iki istek sınırı aşamaz).
 */
function save_with_limits(string $ipHash, string $category, string $message): void
{
    $dir = store_dir();
    $lockFile = fopen($dir . '/.kilit', 'c');
    if ($lockFile === false || !flock($lockFile, LOCK_EX)) {
        fail(500, 'Şu an kaydedemiyoruz, biraz sonra tekrar dene.');
    }

    $now = time();
    $rateFile = $dir . '/.sinir.json';
    $rate = json_decode((string)@file_get_contents($rateFile), true);
    if (!is_array($rate) || !isset($rate['ip'], $rate['all'], $rate['last']) || !is_array($rate['ip'])) {
        $rate = ['ip' => [], 'all' => [], 'last' => []];
    }

    // 24 saatten eski kayıtları ayıkla
    $dayAgo = $now - 86400;
    $keep = static function ($list) use ($dayAgo): array {
        return array_values(array_filter(is_array($list) ? $list : [], static function ($t) use ($dayAgo) {
            return is_int($t) && $t > $dayAgo;
        }));
    };
    foreach ($rate['ip'] as $h => $times) {
        $rate['ip'][$h] = $keep($times);
        if (!$rate['ip'][$h]) {
            unset($rate['ip'][$h]);
        }
    }
    $rate['all'] = $keep($rate['all']);
    $rate['last'] = array_slice(is_array($rate['last']) ? $rate['last'] : [], -50);

    $mine = $rate['ip'][$ipHash] ?? [];
    $recent = count(array_filter($mine, static function ($t) use ($now) {
        return $t > $now - LIMIT_SHORT_WINDOW;
    }));

    $release = static function () use ($lockFile): void {
        flock($lockFile, LOCK_UN);
        fclose($lockFile);
    };

    if ($recent >= LIMIT_SHORT) {
        $release();
        fail(429, 'Çok hızlı gidiyorsun! Birkaç dakika sonra tekrar dene.');
    }
    if (count($mine) >= LIMIT_DAY || count($rate['all']) >= LIMIT_GLOBAL_DAY) {
        $release();
        fail(429, 'Bugünlük öneri kutusu doldu, yarın tekrar dene.');
    }

    // Aynı mesaj (büyük/küçük harf ve boşluk farkı yok sayılarak) tekrar kaydedilmez
    $fingerprint = hash('sha256', mb_strtolower(preg_replace('/\s+/u', ' ', $message), 'UTF-8'));
    if (in_array($fingerprint, $rate['last'], true)) {
        $release();
        fail(409, 'Bu mesajı zaten aldık, teşekkürler!');
    }

    $logFile = $dir . '/oneriler.txt';
    if (is_file($logFile) && filesize($logFile) > LOG_MAX_BYTES) {
        $release();
        error_log('[feedback] oneriler.txt 5 MB sinirina ulasti');
        fail(503, 'Öneri kutusu şu an dolu, daha sonra tekrar dene.');
    }

    $tz = new DateTimeZone('Europe/Istanbul');
    $line = json_encode([
        'tarih'  => (new DateTime('now', $tz))->format('Y-m-d H:i:s'),
        'konu'   => $category,
        'mesaj'  => $message,
        'kisi'   => substr($ipHash, 0, 10), // aynı kişinin mesajlarını ayırt etmek için (IP değil)
    ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . "\n";

    if (@file_put_contents($logFile, $line, FILE_APPEND | LOCK_EX) === false) {
        $release();
        fail(500, 'Şu an kaydedemiyoruz, biraz sonra tekrar dene.');
    }
    @chmod($logFile, 0600);

    $mine[] = $now;
    $rate['ip'][$ipHash] = $mine;
    $rate['all'][] = $now;
    $rate['last'][] = $fingerprint;
    @file_put_contents($rateFile, json_encode($rate), LOCK_EX);
    $release();

    if (NOTIFY_EMAIL !== '' && filter_var(NOTIFY_EMAIL, FILTER_VALIDATE_EMAIL)) {
        // Konu ve alıcı sabit; mesaj sadece gövdede → başlık enjeksiyonu yok
        @mail(NOTIFY_EMAIL, 'saitas.com.tr - yeni oneri', "Konu: $category\n\n$message\n",
            'Content-Type: text/plain; charset=utf-8');
    }
}

/* === İstek ============================================================ */
$method = $_SERVER['REQUEST_METHOD'] ?? '';

if ($method === 'GET') {
    if (!same_origin()) {
        fail(403, 'İzin yok.');
    }
    reply(200, ['ok' => true, 'token' => make_token(secret_key())]);
}

if ($method !== 'POST') {
    header('Allow: GET, POST');
    fail(405, 'İzin yok.');
}

if (!same_origin()) {
    fail(403, 'İzin yok.');
}
$type = strtolower((string)($_SERVER['CONTENT_TYPE'] ?? ''));
if (strpos($type, 'application/json') !== 0) {
    fail(415, 'Geçersiz istek.');
}
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > BODY_MAX) {
    fail(413, 'Mesaj çok uzun.');
}
$body = file_get_contents('php://input', false, null, 0, BODY_MAX + 1);
if (!is_string($body) || strlen($body) > BODY_MAX) {
    fail(413, 'Mesaj çok uzun.');
}
$data = json_decode($body, true, 4);
if (!is_array($data)) {
    fail(400, 'Geçersiz istek.');
}

// Bal küpü: insanlar bu alanı görmez; doluysa bot → başarılı gibi davran, kaydetme
if (!empty($data['website'])) {
    reply(200, ['ok' => true, 'message' => 'Teşekkürler!']);
}

$key = secret_key();
if (!is_string($data['token'] ?? null) || !check_token($data['token'], $key)) {
    fail(403, 'Form süresi doldu, pencereyi kapatıp tekrar aç.');
}

$category = $data['category'] ?? '';
if (!is_string($category) || !in_array($category, CATEGORIES, true)) {
    fail(400, 'Bir konu seç.');
}

$message = is_string($data['message'] ?? null) ? clean_message($data['message']) : '';
$len = mb_strlen($message, 'UTF-8');
if ($len < MSG_MIN) {
    fail(400, 'Mesajın en az ' . MSG_MIN . ' karakter olmalı.');
}
if ($len > MSG_MAX) {
    fail(400, 'Mesajın en fazla ' . MSG_MAX . ' karakter olabilir.');
}
if (preg_match_all('~(https?://|www\.)~iu', $message) > MAX_LINKS) {
    fail(400, 'Mesajda en fazla ' . MAX_LINKS . ' bağlantı olabilir.');
}
if (preg_match('/(.)\1{24,}/u', $message)) {
    fail(400, 'Mesaj anlaşılır görünmüyor, tekrar dener misin?');
}

$ipHash = hash_hmac('sha256', (string)($_SERVER['REMOTE_ADDR'] ?? ''), $key);
save_with_limits($ipHash, $category, $message);

reply(200, ['ok' => true, 'message' => 'Teşekkürler! Önerin bize ulaştı. 💌']);
