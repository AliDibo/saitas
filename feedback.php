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
   8) E-posta bildirimi (isteğe bağlı): alıcı adresi sadece sunucudaki
      ~/saitas-geri-bildirim/eposta.txt dosyasında; günde en fazla 30 mail.
      Gönderim şifreli SMTP ile (ayarlar sunucudaki smtp.txt'de; paylaşımlı
      hostingde mail() kapalı). Sorunlar ~/saitas-geri-bildirim/hata.log'a yazılır.
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
/* E-posta bildirimi: alıcı adresi BU DOSYAYA YAZILMAZ (repo herkese açık, adres
   spam botlarına gider). Adres sadece sunucuda durur:
   ~/saitas-geri-bildirim/eposta.txt  (tek satır, sadece adres). Dosya yoksa mail gitmez. */
const MAIL_FROM = 'noreply@saitas.com.tr'; // gönderen (alan adının kendi adresi → spam'e düşme riski azalır)
const MAIL_DAY_LIMIT = 30;                 // 24 saatte en fazla bu kadar bildirim maili (saldırıda gelen kutun dolmasın)

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

/* Beklenmeyen her hata: ayrıntı sunucu günlüğüne, ziyaretçiye sadece genel JSON mesaj (iç bilgi sızmaz) */
set_exception_handler(static function (\Throwable $e): void {
    error_log('[feedback] ' . get_class($e) . ': ' . $e->getMessage() . ' @' . $e->getLine());
    if (!headers_sent()) {
        http_response_code(500);
    }
    echo json_encode(['ok' => false, 'message' => 'Şu an kaydedemiyoruz, biraz sonra tekrar dene.'], JSON_UNESCAPED_UNICODE);
});

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
    if (!isset($rate['mail'])) {
        $rate['mail'] = [];
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
    $rate['mail'] = $keep($rate['mail']);
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

    $date = (new DateTime('now', new DateTimeZone('Europe/Istanbul')))->format('Y-m-d H:i:s');
    $line = json_encode([
        'tarih'  => $date,
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
    $sendMail = count($rate['mail']) < MAIL_DAY_LIMIT;
    if ($sendMail) {
        $rate['mail'][] = $now;
    }
    @file_put_contents($rateFile, json_encode($rate), LOCK_EX);
    $release();

    if ($sendMail) {
        // Mail ASLA yanıtı bozmamalı: öneri zaten kaydedildi. Sunucu mail()'i kapatmışsa
        // (PHP 8'de ölümcül hata) ya da gönderim başarısızsa sebep hata.log'a yazılır.
        try {
            notify_by_mail($date, $category, $message);
        } catch (\Throwable $e) {
            mail_log(get_class($e) . ': ' . $e->getMessage());
        }
    }
}

/** Mail sorunlarını ~/saitas-geri-bildirim/hata.log'a yazar (cPanel'den okunur, en fazla 64 KB). */
function mail_log(string $reason): void
{
    $file = STORE_DIR . '/hata.log';
    if (is_file($file) && filesize($file) > 65536) {
        return;
    }
    $date = (new DateTime('now', new DateTimeZone('Europe/Istanbul')))->format('Y-m-d H:i:s');
    @file_put_contents($file, $date . ' mail: ' . substr($reason, 0, 300) . "\n", FILE_APPEND | LOCK_EX);
    @chmod($file, 0600);
}

/* === E-posta bildirimi ================================================== */
/** Alıcı adresi: sadece sunucudaki eposta.txt (web kökü ve repo dışında). Geçersizse ''. */
function notify_address(): string
{
    $raw = @file_get_contents(STORE_DIR . '/eposta.txt', false, null, 0, 300);
    $addr = is_string($raw) ? trim($raw) : '';
    // filter_var satır sonu / virgül / boşluk içeren adresi reddeder → başlık enjeksiyonu ve çoklu alıcı imkânsız
    return ($addr !== '' && strlen($addr) <= 254 && filter_var($addr, FILTER_VALIDATE_EMAIL)) ? $addr : '';
}

/**
 * Konu, gönderen ve alıcı sabit; kullanıcı metni SADECE gövdede (düz metin) →
 * kimse başlık ekleyemez, alıcıyı değiştiremez, HTML/script çalıştıramaz.
 * Gönderimde hata olsa bile öneri dosyaya kaydedilmiş olur.
 */
function notify_by_mail(string $date, string $category, string $message): void
{
    $to = notify_address();
    if ($to === '') {
        return;
    }
    $labels = ['oneri' => 'Öneri / istek', 'hata' => 'Hata bildirimi', 'kelime' => 'Kelime önerisi', 'diger' => 'Diğer'];
    $body = "saitas.com.tr öneri kutusuna yeni mesaj geldi.\n\n"
        . 'Tarih: ' . $date . "\n"
        . 'Konu : ' . ($labels[$category] ?? $category) . "\n\n"
        . "Mesaj:\n" . wordwrap($message, 76, "\n", true) . "\n\n"
        . "--\nBu e-posta otomatik gönderildi; yanıtlama.\n"
        . "Mesajı ziyaretçi yazdı: içindeki bağlantılara güvenme, tıklama.\n";
    $subject = '=?UTF-8?B?' . base64_encode('saitas.com.tr – yeni öneri') . '?=';

    // 1) Önce SMTP (paylaşımlı hostingde mail() kapalı; hosting firması açmıyor)
    $smtp = smtp_config();
    if ($smtp !== null) {
        smtp_send($smtp, $to, $subject, $body); // hata → RuntimeException → çağıran hata.log'a yazar
        return;
    }
    // 2) smtp.txt yoksa mail() (başka bir sunucuya taşınırsa çalışsın diye duruyor)
    if (!function_exists('mail')) {
        mail_log('mail() kapali ve smtp.txt yok - saitas-geri-bildirim/smtp.txt olusturulmali');
        return;
    }
    $headers = implode("\r\n", [
        'From: saitas.com.tr <' . MAIL_FROM . '>',
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: 8bit',
        'X-Mailer: saitas-oneri',
    ]);
    // -f: zarf göndericisi alan adının adresi olsun (SPF uyumu); izin yoksa -f'siz dene
    if (!@mail($to, $subject, $body, $headers, '-f' . MAIL_FROM)) {
        if (!@mail($to, $subject, $body, $headers)) {
            mail_log('mail() false dondu (sunucu maili kabul etmedi)');
        }
    }
}

/* === SMTP ================================================================
   Ayarlar SADECE sunucuda: ~/saitas-geri-bildirim/smtp.txt (repo ve web kökü dışında).
   Biçim (her satır anahtar=değer):
     host=mail.saitas.com.tr
     port=465
     user=noreply@saitas.com.tr
     pass=posta-kutusunun-sifresi
   Güvenlik: bağlantı her zaman şifreli (465 SSL / 587 STARTTLS), sunucu sertifikası
   doğrulanır (yalnız localhost'ta doğrulama gerekmez: trafik makineden çıkmaz).
   Şifre hiçbir günlüğe yazılmaz; hata mesajı sadece adım adı + SMTP kodu içerir. */

/** smtp.txt'yi okur ve doğrular. Dosya yoksa null (sessiz), bozuksa null + hata.log. */
function smtp_config(): ?array
{
    $raw = @file_get_contents(STORE_DIR . '/smtp.txt', false, null, 0, 2000);
    if (!is_string($raw)) {
        return null;
    }
    $cfg = [];
    foreach (preg_split('/\R/', $raw) as $line) {
        if (preg_match('/^\s*(host|port|user|pass)\s*=\s*(.*?)\s*$/', $line, $m)) {
            $cfg[$m[1]] = $m[2];
        }
    }
    $host = strtolower($cfg['host'] ?? '');
    $port = (int)($cfg['port'] ?? 0);
    $user = $cfg['user'] ?? '';
    $pass = $cfg['pass'] ?? '';
    if (!preg_match('/^[a-z0-9.-]{1,253}$/', $host) || !in_array($port, [465, 587], true)
        || !filter_var($user, FILTER_VALIDATE_EMAIL) || $pass === '' || strlen($pass) > 200) {
        mail_log('smtp.txt gecersiz: host / port (465 ya da 587) / user (e-posta) / pass satirlarini kontrol et');
        return null;
    }
    return ['host' => $host, 'port' => $port, 'user' => $user, 'pass' => $pass];
}

/** Kimlik doğrulamalı, şifreli SMTP ile tek mail gönderir. Hata → RuntimeException. */
function smtp_send(array $c, string $to, string $subject, string $body): void
{
    if (!function_exists('stream_socket_client')) {
        throw new RuntimeException('stream_socket_client kapali (hosting SMTP baglantisina izin vermiyor)');
    }
    $local = in_array($c['host'], ['localhost', '127.0.0.1'], true);
    $ctx = stream_context_create(['ssl' => [
        'verify_peer'       => !$local,
        'verify_peer_name'  => !$local,
        'allow_self_signed' => $local,
        'peer_name'         => $c['host'],
    ]]);
    $remote = ($c['port'] === 465 ? 'ssl://' : 'tcp://') . $c['host'] . ':' . $c['port'];
    $s = @stream_socket_client($remote, $errno, $errstr, 8, STREAM_CLIENT_CONNECT, $ctx);
    if (!$s) {
        throw new RuntimeException('baglanti kurulamadi: ' . $c['host'] . ':' . $c['port'] . ' (' . $errno . ' ' . $errstr . ')');
    }
    stream_set_timeout($s, 8);

    // Çok satırlı SMTP yanıtını okur ("250-..." devam, "250 ..." son satır); sadece kodu döndürür
    $read = static function () use ($s): int {
        while (($line = fgets($s, 1024)) !== false) {
            if (strlen($line) < 4 || $line[3] !== '-') {
                return (int)substr($line, 0, 3);
            }
        }
        return 0; // zaman aşımı / bağlantı koptu
    };
    $step = static function (?string $command, array $okCodes, string $name) use ($s, $read): void {
        if ($command !== null) {
            fwrite($s, $command . "\r\n");
        }
        $code = $read();
        if (!in_array($code, $okCodes, true)) {
            throw new RuntimeException('SMTP ' . $name . ' basarisiz (kod ' . $code . ')');
        }
    };

    try {
        $step(null, [220], 'karsilama');
        $step('EHLO saitas.com.tr', [250], 'EHLO');
        if ($c['port'] === 587) {
            $step('STARTTLS', [220], 'STARTTLS');
            $method = STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT
                | (defined('STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT') ? STREAM_CRYPTO_METHOD_TLSv1_3_CLIENT : 0);
            if (!@stream_socket_enable_crypto($s, true, $method)) {
                throw new RuntimeException('SMTP TLS baslatilamadi (sertifika / host adi uyusmuyor olabilir)');
            }
            $step('EHLO saitas.com.tr', [250], 'EHLO (TLS)');
        }
        $step('AUTH LOGIN', [334], 'AUTH');
        $step(base64_encode($c['user']), [334], 'AUTH kullanici');
        $step(base64_encode($c['pass']), [235], 'giris (kullanici adi ya da sifre yanlis olabilir)');
        $step('MAIL FROM:<' . $c['user'] . '>', [250], 'MAIL FROM');
        $step('RCPT TO:<' . $to . '>', [250, 251], 'RCPT TO');
        $step('DATA', [354], 'DATA');

        // Gövde base64: nokta ile başlayan satır / 8-bit sorunu olmaz; başlıklar sabit
        $domain = substr((string)strrchr($c['user'], '@'), 1);
        $data = implode("\r\n", [
            'Date: ' . date('r'),
            'From: saitas.com.tr <' . $c['user'] . '>',
            'To: <' . $to . '>',
            'Subject: ' . $subject,
            'Message-ID: <' . bin2hex(random_bytes(12)) . '@' . $domain . '>',
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
            'Content-Transfer-Encoding: base64',
            'X-Mailer: saitas-oneri',
            '',
            rtrim(chunk_split(base64_encode(str_replace("\n", "\r\n", $body)), 76, "\r\n")),
        ]);
        $step($data . "\r\n.", [250], 'gonderim');
        fwrite($s, "QUIT\r\n");
    } finally {
        fclose($s);
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
