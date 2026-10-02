<?php
// RemoTap shared server helpers (orders, profiles, taps). Plain PHP, no database.
declare(strict_types=1);

const RT_ROOT = __DIR__;
const RT_DATA = __DIR__ . '/data';
const RT_UPLOADS = __DIR__ . '/uploads';

function rt_site(): array {
    static $c = null;
    if ($c === null) {
        $c = json_decode((string)file_get_contents(RT_ROOT . '/site-config.json'), true) ?: [];
    }
    return $c;
}

function rt_private(): array {
    static $c = null;
    if ($c === null) {
        $f = RT_ROOT . '/private/config.php';
        $c = is_file($f) ? (array)require $f : [];
    }
    return $c;
}

function rt_base_url(): string {
    $b = rtrim((string)(rt_private()['base_url'] ?? ''), '/');
    if ($b !== '') return $b;
    $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    return $scheme . '://' . ($_SERVER['HTTP_HOST'] ?? 'localhost');
}

function h(?string $s): string {
    return htmlspecialchars((string)$s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function rt_clean(?string $s, int $max = 300): string {
    $s = trim(str_replace(["\r", "\0"], '', (string)$s));
    return mb_substr($s, 0, $max);
}

function rt_slug_ok(string $slug): bool {
    return (bool)preg_match('/^[a-z0-9][a-z0-9_-]{0,63}$/', $slug);
}

function rt_slugify(string $s): string {
    $s = strtolower(trim($s));
    $s = preg_replace('/[^a-z0-9]+/', '-', $s) ?? '';
    return trim(substr($s, 0, 40), '-');
}

/* ---------- JSON file storage with locking ---------- */
function rt_read_json(string $path): ?array {
    if (!is_file($path)) return null;
    $d = json_decode((string)file_get_contents($path), true);
    return is_array($d) ? $d : null;
}

function rt_write_json(string $path, array $data): void {
    $dir = dirname($path);
    if (!is_dir($dir)) mkdir($dir, 0755, true);
    $tmp = $path . '.' . bin2hex(random_bytes(4)) . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES), LOCK_EX);
    rename($tmp, $path);
}

function rt_profile_path(string $slug): string { return RT_DATA . "/profiles/$slug.json"; }
function rt_order_path(string $id): string { return RT_DATA . "/orders/$id.json"; }

function rt_get_profile(string $slug): ?array {
    return rt_slug_ok($slug) ? rt_read_json(rt_profile_path($slug)) : null;
}

function rt_list(string $dir): array {
    $out = [];
    foreach (glob(RT_DATA . "/$dir/*.json") ?: [] as $f) {
        $d = rt_read_json($f);
        if ($d) $out[] = $d;
    }
    return $out;
}

/* ---------- Tap counting ---------- */
function rt_count_tap(string $slug, string $source): void {
    $source = in_array($source, ['nfc', 'qr'], true) ? $source : 'web';
    $path = RT_DATA . "/taps/$slug.json";
    if (!is_dir(dirname($path))) mkdir(dirname($path), 0755, true);
    $fp = fopen($path, 'c+');
    if (!$fp) return;
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $d = json_decode($raw ?: '{}', true) ?: [];
    $m = date('Y-m');
    $d[$m][$source] = ($d[$m][$source] ?? 0) + 1;
    $d['total'] = ($d['total'] ?? 0) + 1;
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($d));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
}

function rt_taps(string $slug): array {
    return rt_read_json(RT_DATA . "/taps/$slug.json") ?? [];
}

/* ---------- Links ---------- */
const RT_LINK_TYPES = ['instapay', 'vfcash', 'whatsapp', 'phone', 'email', 'resume', 'instagram', 'linkedin', 'facebook', 'tiktok', 'google', 'website', 'menu'];

function rt_eg_phone(string $v): string {
    $d = preg_replace('/\D+/', '', $v) ?? '';
    if (str_starts_with($d, '0020')) $d = substr($d, 2);
    if (str_starts_with($d, '01') && strlen($d) === 11) $d = '2' . $d;
    if (str_starts_with($d, '1') && strlen($d) === 10) $d = '20' . $d;
    return $d;
}

function rt_https(string $v): string {
    if (preg_match('~^https?://~i', $v)) return $v;
    return 'https://' . ltrim($v, '/');
}

/** Turns what the customer typed into a safe URL. Returns '' when it can't. */
function rt_link_url(string $type, string $v): string {
    $v = trim($v);
    if ($v === '') return '';
    $handle = ltrim($v, '@');
    switch ($type) {
        case 'whatsapp': return preg_match('~^https?://~i', $v) ? $v : 'https://wa.me/' . rt_eg_phone($v);
        case 'phone':    return 'tel:+' . rt_eg_phone($v);
        case 'email':    return filter_var($v, FILTER_VALIDATE_EMAIL) ? 'mailto:' . $v : '';
        case 'instagram': return preg_match('~[./]~', $handle) ? rt_https($v) : 'https://instagram.com/' . rawurlencode($handle);
        case 'tiktok':   return preg_match('~[./]~', $handle) ? rt_https($v) : 'https://www.tiktok.com/@' . rawurlencode($handle);
        case 'facebook': return preg_match('~[./]~', $handle) ? rt_https($v) : 'https://facebook.com/' . rawurlencode($handle);
        case 'linkedin': return preg_match('~[./]~', $handle) ? rt_https($v) : 'https://www.linkedin.com/in/' . rawurlencode($handle);
        case 'instapay': return preg_match('~^https?://~i', $v) ? $v : ''; // plain handle: shown with a copy button
        case 'vfcash':   return ''; // Vodafone Cash has no payment link: the wallet number is shown with a copy button
        default:         return rt_https($v);
    }
}

function rt_safe_url(string $u): string {
    return preg_match('~^(https?://|tel:|mailto:)~i', $u) ? $u : '';
}

/* ---------- Uploads ---------- */
/** Saves an uploaded image under uploads/ with a random name. Returns the web path or ''. */
function rt_save_image(array $file): string {
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) return '';
    if (($file['size'] ?? 0) > 5 * 1024 * 1024) return '';
    $info = @getimagesize($file['tmp_name']);
    $ext = [IMAGETYPE_JPEG => 'jpg', IMAGETYPE_PNG => 'png', IMAGETYPE_WEBP => 'webp'][$info[2] ?? 0] ?? null;
    if (!$ext) return '';
    if (!is_dir(RT_UPLOADS)) mkdir(RT_UPLOADS, 0755, true);
    $name = date('Ymd') . '-' . bin2hex(random_bytes(8)) . '.' . $ext;
    if (!move_uploaded_file($file['tmp_name'], RT_UPLOADS . '/' . $name)) return '';
    return 'uploads/' . $name;
}

/* ---------- Plans ---------- */
function rt_profile_mode(array $p): string {
    if (empty($p['active'])) return 'off';
    if (($p['plan'] ?? 'basic') === 'plus') {
        $exp = $p['expires'] ?? '';
        if ($exp === '' || $exp >= date('Y-m-d')) return 'page';
    }
    return 'single'; // Basic, or Plus that wasn't renewed: open the main link only
}

function rt_primary(array $p): array {
    if (!empty($p['primary']['type']) && !empty($p['primary']['value'])) return $p['primary'];
    return $p['links'][0] ?? ['type' => 'website', 'value' => rt_base_url()];
}
