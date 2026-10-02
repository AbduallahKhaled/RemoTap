<?php
// RemoTap admin: orders, customer pages, tap counts, QR codes. One password, no database.
declare(strict_types=1);
require __DIR__ . '/lib.php';

session_set_cookie_params(['httponly' => true, 'samesite' => 'Strict', 'secure' => !empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off']);
session_start();
header('X-Frame-Options: DENY');
header('Cache-Control: no-store');

$authFile = RT_DATA . '/admin.json';
$auth = rt_read_json($authFile);
if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(16));
$csrf = $_SESSION['csrf'];
$flash = $_SESSION['flash'] ?? '';
unset($_SESSION['flash']);

function csrf_ok(): bool { return hash_equals($_SESSION['csrf'] ?? '', (string)($_POST['csrf'] ?? '')); }
function go(string $q = '', string $msg = ''): never {
    if ($msg !== '') $_SESSION['flash'] = $msg;
    header('Location: admin.php' . ($q !== '' ? "?$q" : ''), true, 303);
    exit;
}

const STATUSES = [
    'awaiting_payment' => 'Awaiting payment',
    'paid' => 'Paid',
    'printing' => 'Printing',
    'shipped' => 'Shipped',
    'delivered' => 'Delivered',
    'cancelled' => 'Cancelled',
];

/* ---------- First run: create the password ---------- */
if (!$auth) {
    $err = '';
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok()) {
        $pw = (string)($_POST['pw'] ?? '');
        if (strlen($pw) < 10) $err = 'Use at least 10 characters.';
        elseif ($pw !== ($_POST['pw2'] ?? '')) $err = 'The two passwords don\'t match.';
        else {
            rt_write_json($authFile, ['hash' => password_hash($pw, PASSWORD_DEFAULT), 'created' => date('c')]);
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            go('', 'Password saved. Welcome to your RemoTap admin.');
        }
    }
    page_head('Set up admin');
    echo '<div class="panel login"><h1>Create your admin password</h1><p class="muted">This is the first time the admin page is opened. The password you choose here protects your orders and customer pages.</p>';
    if ($err) echo '<p class="err">' . h($err) . '</p>';
    echo '<form method="post"><input type="hidden" name="csrf" value="' . h($csrf) . '">
      <div class="field"><label>Password</label><input class="input" type="password" name="pw" autocomplete="new-password" required minlength="10"></div>
      <div class="field"><label>Repeat password</label><input class="input" type="password" name="pw2" autocomplete="new-password" required minlength="10"></div>
      <button class="btn btn-block">Save password</button></form></div>';
    page_foot();
    exit;
}

/* ---------- Login / logout ---------- */
if (isset($_GET['logout'])) { $_SESSION = []; session_destroy(); header('Location: admin.php'); exit; }
if (empty($_SESSION['admin'])) {
    $err = '';
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok()) {
        usleep(400000);
        if (password_verify((string)($_POST['pw'] ?? ''), (string)$auth['hash'])) {
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            go();
        }
        $err = 'Wrong password.';
    }
    page_head('Admin login');
    echo '<div class="panel login"><h1>RemoTap admin</h1>';
    if ($err) echo '<p class="err">' . h($err) . '</p>';
    echo '<form method="post"><input type="hidden" name="csrf" value="' . h($csrf) . '">
      <div class="field"><label>Password</label><input class="input" type="password" name="pw" autocomplete="current-password" required autofocus></div>
      <button class="btn btn-block">Log in</button></form></div>';
    page_foot();
    exit;
}

/* ---------- Actions ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!csrf_ok()) go('', 'Session expired, please try again.');
    $action = $_POST['action'] ?? '';

    if ($action === 'status') {
        $id = (string)($_POST['id'] ?? '');
        $o = preg_match('/^RT-[0-9]{6}-[A-Z0-9]{4}$/', $id) ? rt_read_json(rt_order_path($id)) : null;
        $st = (string)($_POST['status'] ?? '');
        if ($o && isset(STATUSES[$st])) {
            $o['status'] = $st;
            $o['history'][] = ['status' => $st, 'at' => date('c')];
            rt_write_json(rt_order_path($id), $o);
        }
        go('tab=orders#' . $id, "Order $id marked " . (STATUSES[$st] ?? $st) . '.');
    }

    if ($action === 'make_page') {
        $id = (string)($_POST['id'] ?? '');
        $o = preg_match('/^RT-[0-9]{6}-[A-Z0-9]{4}$/', $id) ? rt_read_json(rt_order_path($id)) : null;
        if (!$o) go('tab=orders', 'Order not found.');
        if (!empty($o['profile'])) go('edit=' . $o['profile']);
        $base = rt_slugify($o['page']['print_text'] ?: $o['page']['name']) ?: strtolower($id);
        $slug = $base;
        for ($i = 2; is_file(rt_profile_path($slug)); $i++) $slug = $base . '-' . $i;
        $profile = [
            'slug' => $slug,
            'plan' => $o['plan'],
            'active' => true,
            'expires' => $o['plan'] === 'plus' ? date('Y-m-d', strtotime('+1 year')) : '',
            'name' => $o['page']['name'],
            'title' => $o['page']['title'],
            'bio' => $o['page']['bio'],
            'lang' => $o['page']['lang'],
            'photo' => $o['page']['logo'],
            'links' => $o['page']['links'],
            'primary' => $o['page']['links'][0] ?? null,
            'order_id' => $id,
            'created' => date('Y-m-d'),
        ];
        rt_write_json(rt_profile_path($slug), $profile);
        $o['profile'] = $slug;
        rt_write_json(rt_order_path($id), $o);
        go('edit=' . $slug, "Page created from order $id. Check it, then program the chip with the link below.");
    }

    if ($action === 'save_profile') {
        $slug = strtolower((string)($_POST['slug'] ?? ''));
        $orig = (string)($_POST['orig'] ?? '');
        if (!rt_slug_ok($slug)) go($orig ? "edit=$orig" : 'new=1', 'Page link can only use a-z, 0-9 and dashes.');
        if ($slug !== $orig && is_file(rt_profile_path($slug))) go($orig ? "edit=$orig" : 'new=1', "The link /p/$slug is already taken.");
        $p = ($orig && rt_slug_ok($orig)) ? (rt_get_profile($orig) ?? []) : ['created' => date('Y-m-d')];
        $links = [];
        foreach (preg_split('/\R/', (string)($_POST['links'] ?? '')) ?: [] as $line) {
            if (!str_contains($line, '|')) continue;
            [$t, $v] = array_map('trim', explode('|', $line, 2));
            $t = strtolower($t);
            if (in_array($t, RT_LINK_TYPES, true) && $v !== '') $links[] = ['type' => $t, 'value' => rt_clean($v, 300)];
        }
        $pt = strtolower(trim((string)($_POST['primary_type'] ?? '')));
        $primary = null;
        foreach ($links as $l) if ($l['type'] === $pt) { $primary = $l; break; }
        $p = array_merge($p, [
            'slug' => $slug,
            'plan' => ($_POST['plan'] ?? '') === 'plus' ? 'plus' : 'basic',
            'active' => !empty($_POST['active']),
            'expires' => preg_match('/^\d{4}-\d{2}-\d{2}$/', (string)($_POST['expires'] ?? '')) ? $_POST['expires'] : '',
            'name' => rt_clean($_POST['name'] ?? '', 60),
            'title' => rt_clean($_POST['title'] ?? '', 80),
            'bio' => rt_clean($_POST['bio'] ?? '', 220),
            'lang' => in_array($_POST['lang'] ?? '', ['en', 'ar', 'both'], true) ? $_POST['lang'] : 'en',
            'links' => $links,
            'primary' => $primary ?? ($links[0] ?? null),
        ]);
        if (!empty($_FILES['photo']['name'])) {
            $img = rt_save_image($_FILES['photo']);
            if ($img) $p['photo'] = $img;
        }
        if (!empty($_POST['remove_photo'])) $p['photo'] = '';
        rt_write_json(rt_profile_path($slug), $p);
        if ($orig && $orig !== $slug) {
            @unlink(rt_profile_path($orig));
            if (is_file(RT_DATA . "/taps/$orig.json")) rename(RT_DATA . "/taps/$orig.json", RT_DATA . "/taps/$slug.json");
        }
        go('edit=' . $slug, 'Saved.');
    }
}

/* ---------- Views ---------- */
$tab = $_GET['tab'] ?? 'orders';
$month = date('Y-m');
$orders = rt_list('orders');
usort($orders, fn($a, $b) => strcmp($b['created'], $a['created']));
$profiles = rt_list('profiles');
usort($profiles, fn($a, $b) => strcmp($b['created'] ?? '', $a['created'] ?? ''));

$awaiting = count(array_filter($orders, fn($o) => $o['status'] === 'awaiting_payment'));
$revMonth = array_sum(array_map(fn($o) => $o['total'], array_filter($orders, fn($o) => str_starts_with($o['created'], $month) && !in_array($o['status'], ['awaiting_payment', 'cancelled'], true))));
$tapsMonth = 0;
foreach ($profiles as $pr) { $t = rt_taps($pr['slug']); $tapsMonth += array_sum($t[$month] ?? []); }

page_head('RemoTap admin');
?>
<div class="bar">
  <div class="brand"><img src="assets/img/mark-64.png" alt="" width="30"><span class="wordmark">REMO<span class="t">T</span><span class="ap">AP</span></span> <span class="muted">admin</span></div>
  <nav>
    <a class="<?= $tab === 'orders' && !isset($_GET['edit']) && !isset($_GET['new']) ? 'on' : '' ?>" href="?tab=orders">Orders</a>
    <a class="<?= $tab === 'pages' || isset($_GET['edit']) || isset($_GET['new']) ? 'on' : '' ?>" href="?tab=pages">Customer pages</a>
    <a href="index.html" target="_blank">Site ↗</a>
    <a href="?logout=1">Log out</a>
  </nav>
</div>
<?php if ($flash): ?><div class="flash"><?= h($flash) ?></div><?php endif; ?>

<div class="kpis">
  <div><span>Awaiting payment</span><b><?= $awaiting ?></b></div>
  <div><span>Paid revenue this month</span><b><?= number_format($revMonth) ?> <small>EGP</small></b></div>
  <div><span>Taps this month</span><b><?= number_format($tapsMonth) ?></b></div>
  <div><span>Live pages</span><b><?= count(array_filter($profiles, fn($p) => !empty($p['active']))) ?></b></div>
</div>

<?php
/* ---------- Edit / new page ---------- */
if (isset($_GET['edit']) || isset($_GET['new'])):
    $slug = strtolower((string)($_GET['edit'] ?? ''));
    $p = $slug ? rt_get_profile($slug) : null;
    if ($slug && !$p) { echo '<p class="err">Page not found.</p>'; page_foot(); exit; }
    $p = $p ?? ['slug' => '', 'plan' => 'plus', 'active' => true, 'expires' => date('Y-m-d', strtotime('+1 year')), 'name' => '', 'title' => '', 'bio' => '', 'lang' => 'en', 'links' => [], 'primary' => null, 'photo' => ''];
    $linkText = implode("\n", array_map(fn($l) => $l['type'] . ' | ' . $l['value'], $p['links'] ?? []));
    $url = rt_base_url() . '/p/' . $p['slug'];
    $taps = $p['slug'] ? rt_taps($p['slug']) : [];
?>
  <div class="grid2">
    <form class="panel" method="post" enctype="multipart/form-data">
      <h2><?= $p['slug'] ? 'Edit page' : 'New page' ?></h2>
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="save_profile"><input type="hidden" name="orig" value="<?= h($p['slug']) ?>">
      <div class="row2">
        <div class="field"><label>Page link</label><div class="prefix"><span>/p/</span><input class="input ltr" name="slug" value="<?= h($p['slug']) ?>" required pattern="[a-z0-9][a-z0-9_-]{0,63}"></div><span class="hint">Changing it breaks chips already programmed with the old link.</span></div>
        <div class="field"><label>Plan</label><select class="input" name="plan"><option value="plus" <?= $p['plan'] === 'plus' ? 'selected' : '' ?>>Plus (full page)</option><option value="basic" <?= $p['plan'] === 'basic' ? 'selected' : '' ?>>Basic (opens main link)</option></select></div>
      </div>
      <div class="row2">
        <div class="field"><label>Plus paid until</label><input class="input" type="date" name="expires" value="<?= h($p['expires']) ?>"><span class="hint">After this date it opens the main link only.</span></div>
        <div class="field"><label>Page language</label><select class="input" name="lang"><?php foreach (['en' => 'English', 'ar' => 'Arabic', 'both' => 'Both (visitor picks)'] as $k => $v): ?><option value="<?= $k ?>" <?= $p['lang'] === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select></div>
      </div>
      <div class="field"><label>Name</label><input class="input" name="name" value="<?= h($p['name']) ?>" required maxlength="60"></div>
      <div class="field"><label>Title / tagline</label><input class="input" name="title" value="<?= h($p['title']) ?>" maxlength="80"></div>
      <div class="field"><label>Bio</label><textarea class="input" name="bio" maxlength="220"><?= h($p['bio']) ?></textarea></div>
      <div class="field"><label>Links, one per line as <code>type | value</code></label>
        <textarea class="input ltr" name="links" rows="7"><?= h($linkText) ?></textarea>
        <span class="hint">Types: <?= implode(', ', RT_LINK_TYPES) ?>. Order here = order on the page.</span></div>
      <div class="row2">
        <div class="field"><label>Main link (Basic + after expiry)</label><select class="input" name="primary_type"><?php foreach (RT_LINK_TYPES as $t): ?><option value="<?= $t ?>" <?= ($p['primary']['type'] ?? '') === $t ? 'selected' : '' ?>><?= $t ?></option><?php endforeach; ?></select></div>
        <div class="field"><label>Photo / logo</label><input class="input" type="file" name="photo" accept="image/png,image/jpeg,image/webp">
          <?php if (!empty($p['photo'])): ?><label class="check"><input type="checkbox" name="remove_photo" value="1"> Remove current photo</label><?php endif; ?></div>
      </div>
      <label class="check"><input type="checkbox" name="active" value="1" <?= !empty($p['active']) ? 'checked' : '' ?>> Page is live</label>
      <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn">Save page</button><?php if ($p['slug']): ?><a class="btn btn-ghost" href="p/<?= h($p['slug']) ?>?embed=1" target="_blank">Preview</a><?php endif; ?></div>
    </form>

    <?php if ($p['slug']): ?>
    <div class="panel">
      <h2>Program the product</h2>
      <p class="muted">Write the first link to the NFC chip (with the free “NFC Tools” app). Print the QR on the product as the backup.</p>
      <div class="field"><label>NFC chip link</label><div class="copy"><code id="u-nfc"><?= h($url) ?>?s=n</code><button type="button" class="btn btn-ghost btn-sm" data-copy="u-nfc">Copy</button></div></div>
      <div class="field"><label>QR code link</label><div class="copy"><code id="u-qr"><?= h($url) ?>?s=q</code><button type="button" class="btn btn-ghost btn-sm" data-copy="u-qr">Copy</button></div></div>
      <div id="qr" class="qr"></div>
      <a class="btn btn-ghost btn-sm" id="qr-dl" download="<?= h($p['slug']) ?>-qr.png" href="#">Download QR (PNG)</a>
      <h3 style="margin-top:26px">Taps</h3>
      <table class="tbl"><thead><tr><th>Month</th><th>Chip</th><th>QR</th><th>Other</th></tr></thead><tbody>
      <?php $months = array_filter(array_keys($taps), fn($k) => $k !== 'total'); rsort($months);
        foreach (array_slice($months, 0, 6) as $m): $r = $taps[$m]; ?>
        <tr><td><?= h($m) ?></td><td><?= (int)($r['nfc'] ?? 0) ?></td><td><?= (int)($r['qr'] ?? 0) ?></td><td><?= (int)($r['web'] ?? 0) ?></td></tr>
      <?php endforeach; if (!$months): ?><tr><td colspan="4" class="muted">No taps yet.</td></tr><?php endif; ?>
      </tbody></table>
      <p class="muted">All time: <?= (int)($taps['total'] ?? 0) ?></p>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
    <script>
      new QRCode(document.getElementById('qr'), { text: <?= json_encode($url . '?s=q') ?>, width: 220, height: 220, colorDark: '#00000E', colorLight: '#ffffff', correctLevel: QRCode.CorrectLevel.M });
      setTimeout(function () { var c = document.querySelector('#qr canvas'); if (c) document.getElementById('qr-dl').href = c.toDataURL('image/png'); }, 300);
    </script>
    <?php endif; ?>
  </div>

<?php
/* ---------- Pages list ---------- */
elseif ($tab === 'pages'):
?>
  <div class="panel">
    <div class="head"><h2>Customer pages</h2><a class="btn btn-sm" href="?new=1">+ New page</a></div>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>Name</th><th>Link</th><th>Plan</th><th>Paid until</th><th>Taps (<?= h($month) ?>)</th><th>All time</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($profiles as $pr): $t = rt_taps($pr['slug']); $mode = rt_profile_mode($pr); ?>
        <tr>
          <td><b><?= h($pr['name']) ?></b><?php if ($mode === 'off'): ?> <span class="pill off">off</span><?php elseif ($mode === 'single' && $pr['plan'] === 'plus'): ?> <span class="pill warn">expired</span><?php endif; ?></td>
          <td><a href="p/<?= h($pr['slug']) ?>?embed=1" target="_blank">/p/<?= h($pr['slug']) ?></a></td>
          <td><?= h(ucfirst($pr['plan'])) ?></td>
          <td><?= h($pr['expires'] ?: '—') ?></td>
          <td><?= array_sum($t[$month] ?? []) ?></td>
          <td><?= (int)($t['total'] ?? 0) ?></td>
          <td><a class="btn btn-ghost btn-sm" href="?edit=<?= h($pr['slug']) ?>">Edit</a></td>
        </tr>
      <?php endforeach; if (!$profiles): ?><tr><td colspan="7" class="muted">No pages yet.</td></tr><?php endif; ?>
      </tbody>
    </table></div>
  </div>

<?php
/* ---------- Orders ---------- */
else:
?>
  <div class="panel">
    <div class="head"><h2>Orders</h2><span class="muted"><?= count($orders) ?> total</span></div>
    <?php $src = []; foreach ($orders as $o) { if ($o['status'] === 'cancelled') continue; $k = $o['source'] ?? 'direct'; $src[$k] = ($src[$k] ?? 0) + 1; } arsort($src);
      if ($src): ?><p class="muted" style="margin:-4px 0 14px">Where orders come from: <?= h(implode(' · ', array_map(fn($k, $v) => "$k $v", array_keys($src), $src))) ?></p><?php endif; ?>
    <?php if (!$orders): ?><p class="muted">No orders yet. They appear here as soon as someone orders on the site.</p><?php endif; ?>
    <?php foreach ($orders as $o): $c = $o['customer']; ?>
      <details class="order" id="<?= h($o['id']) ?>" <?= $o['status'] === 'awaiting_payment' ? 'open' : '' ?>>
        <summary>
          <span class="st st-<?= h($o['status']) ?>"><?= h(STATUSES[$o['status']] ?? $o['status']) ?></span>
          <b class="ltr"><?= h($o['id']) ?></b>
          <span><?= h($c['name']) ?></span>
          <span class="muted"><?php if (!empty($o['items'])): ?><?= h(implode(' + ', array_map(fn($i) => ucfirst($i['product']) . ' ' . ucfirst($i['plan']) . ' × ' . (int)$i['qty'], $o['items']))) ?><?php else: ?><?= h(ucfirst($o['product'])) ?> · <?= h(ucfirst($o['plan'])) ?> × <?= (int)$o['qty'] ?><?php endif; ?></span>
          <b class="amt"><?= number_format((int)$o['total']) ?> EGP</b>
        </summary>
        <div class="grid2 inner">
          <div>
            <p><span class="muted">Placed</span> <?= h(date('j M Y, H:i', strtotime($o['created']))) ?></p>
            <p><span class="muted">Phone</span> <a class="ltr" href="https://wa.me/<?= h(rt_eg_phone($c['phone'])) ?>" target="_blank"><?= h($c['phone']) ?> (WhatsApp)</a></p>
            <?php if ($c['email']): ?><p><span class="muted">Email</span> <?= h($c['email']) ?></p><?php endif; ?>
            <p><span class="muted">Deliver to</span> <?= h(ucfirst($c['area'])) ?>, <?= h($c['address']) ?></p>
            <?php if ($c['notes']): ?><p><span class="muted">Notes</span> <?= h($c['notes']) ?></p><?php endif; ?>
            <p><span class="muted">Came from</span> <?= h($o['source'] ?? 'direct') ?></p>
            <?php if (!empty($o['items'])): ?>
              <?php foreach ($o['items'] as $i): ?><p><span class="muted"><?= h(ucfirst($i['product']) . ' ' . ucfirst($i['plan'])) ?><?= $i['design'] ? ' · look: ' . h($i['design']) : '' ?></span> <?= (int)$i['unit_price'] ?> × <?= (int)$i['qty'] ?></p><?php endforeach; ?>
              <p><span class="muted">Delivery</span> <?= (int)$o['delivery_fee'] ?></p>
            <?php else: ?>
            <p><span class="muted">Price</span> <?= (int)$o['unit_price'] ?> × <?= (int)$o['qty'] ?> + <?= (int)$o['delivery_fee'] ?> delivery</p>
            <?php endif; ?>
            <form method="post" class="status-form">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="status"><input type="hidden" name="id" value="<?= h($o['id']) ?>">
              <select class="input" name="status"><?php foreach (STATUSES as $k => $v): ?><option value="<?= $k ?>" <?= $o['status'] === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select>
              <button class="btn btn-sm">Update</button>
            </form>
          </div>
          <div>
            <p><span class="muted">Print on product</span> <b><?= h($o['page']['print_text']) ?></b></p>
            <p><span class="muted">Page name</span> <?= h($o['page']['name']) ?><?= $o['page']['title'] ? ' · ' . h($o['page']['title']) : '' ?></p>
            <?php foreach ($o['page']['links'] as $l): ?><p><span class="muted"><?= h($l['type']) ?></span> <span class="ltr"><?= h($l['value']) ?></span></p><?php endforeach; ?>
            <?php if ($o['page']['logo']): ?><p><a href="<?= h($o['page']['logo']) ?>" target="_blank"><img src="<?= h($o['page']['logo']) ?>" alt="logo" class="logo-thumb"></a></p><?php endif; ?>
            <?php if (!empty($o['profile'])): ?>
              <a class="btn btn-ghost btn-sm" href="?edit=<?= h($o['profile']) ?>">Open page /p/<?= h($o['profile']) ?></a>
            <?php else: ?>
              <form method="post"><input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="make_page"><input type="hidden" name="id" value="<?= h($o['id']) ?>"><button class="btn btn-sm">Create page from this order</button></form>
            <?php endif; ?>
          </div>
        </div>
      </details>
    <?php endforeach; ?>
  </div>
<?php endif; ?>

<script>
document.addEventListener('click', function (e) {
  var b = e.target.closest('[data-copy]'); if (!b) return;
  var t = document.getElementById(b.dataset.copy).textContent;
  navigator.clipboard && navigator.clipboard.writeText(t);
  var o = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = o; }, 1200);
});
</script>
<?php
page_foot();

/* ---------- Layout ---------- */
function page_head(string $title): void { ?>
<!doctype html>
<html lang="en" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title><?= h($title) ?></title><meta name="robots" content="noindex,nofollow">
<link rel="icon" type="image/png" href="assets/img/favicon-48.png">
<link href="https://fonts.googleapis.com/css2?family=Michroma&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/site.css">
<style>
body{font-size:15px}.wrap{padding:20px 0 60px}
.login{max-width:420px;margin:12vh auto 0}.login h1{font-size:1.4rem;margin-bottom:10px;text-transform:none}
.muted{color:var(--muted)}.err{color:#ff8da1;margin:10px 0}
.bar{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;margin-bottom:18px}
.bar .brand{gap:10px}.bar nav{display:flex;gap:6px;flex-wrap:wrap}.bar nav a{padding:8px 14px;border-radius:99px;color:var(--muted)}.bar nav a.on,.bar nav a:hover{background:var(--surface-2);color:#fff}
.flash{padding:12px 16px;border-radius:12px;background:rgba(62,224,143,.12);border:1px solid rgba(62,224,143,.35);margin-bottom:16px}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:18px}.kpis div{padding:16px;border-radius:16px;background:var(--surface);border:1px solid var(--line)}.kpis span{display:block;color:var(--muted);font-size:.8rem}.kpis b{font-family:Michroma,sans-serif;font-size:1.3rem}
@media(max-width:760px){.kpis{grid-template-columns:1fr 1fr}}
.panel h2{font-size:1.15rem;text-transform:none;margin-bottom:14px}.head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px}.head h2{margin:0}
.grid2{display:grid;grid-template-columns:1.2fr 1fr;gap:18px;align-items:start}@media(max-width:900px){.grid2{grid-template-columns:1fr}}
.order{border:1px solid var(--line);border-radius:14px;margin-bottom:10px;background:var(--surface)}.order summary{cursor:pointer;list-style:none;display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:14px 16px}.order summary::-webkit-details-marker{display:none}.order .amt{margin-left:auto}
.order .inner{padding:0 16px 16px;gap:24px}.order p{margin:6px 0}.order p .muted{display:inline-block;min-width:110px}
.st{font-size:.75rem;font-weight:700;padding:4px 10px;border-radius:99px;background:var(--surface-2)}.st-awaiting_payment{background:rgba(255,184,77,.16);color:#ffc971}.st-paid,.st-printing{background:rgba(55,118,255,.18);color:#a9c3ff}.st-shipped{background:rgba(140,82,255,.18);color:#cdb6ff}.st-delivered{background:rgba(62,224,143,.15);color:#7ff0b5}.st-cancelled{color:var(--faint)}
.status-form{display:flex;gap:8px;margin-top:12px}.status-form select{min-height:40px;padding:6px 12px}
.tbl{width:100%;border-collapse:collapse}.tbl th,.tbl td{text-align:left;padding:10px 8px;border-bottom:1px solid var(--line);font-size:.9rem}.tbl th{color:var(--muted);font-weight:600;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}.scroll{overflow-x:auto}
.pill{font-size:.7rem;padding:2px 8px;border-radius:99px;background:var(--surface-2)}.pill.warn{background:rgba(255,184,77,.16);color:#ffc971}.pill.off{color:var(--faint)}
.prefix{display:flex;align-items:center;border:1.5px solid var(--line);border-radius:14px;background:var(--surface)}.prefix span{padding-left:14px;color:var(--muted)}.prefix .input{border:0;background:transparent;padding-left:4px}
.check{display:flex;gap:8px;align-items:center;margin-top:8px;font-size:.9rem}
.copy{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.copy code{padding:8px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--line);font-size:.85rem;word-break:break-all}
.qr{background:#fff;padding:12px;border-radius:14px;width:max-content;margin:6px 0 12px}.logo-thumb{width:90px;height:90px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}
</style></head><body><div class="atmos" aria-hidden="true"></div><main class="wrap">
<?php }

function page_foot(): void { ?>
</main></body></html>
<?php }
