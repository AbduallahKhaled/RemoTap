<?php
// RemoTap admin: dashboard, orders, InstaPay transfers, shipping, inventory, discount codes, customers, reviews,
// reports, distributor requests, products and prices, customer pages, settings. One password, no database.
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
    // 5 wrong passwords from one address lock the login for 15 minutes.
    $failFile = RT_DATA . '/login-fails.json';
    $ipKey = substr(hash('sha256', ($_SERVER['REMOTE_ADDR'] ?? '') . 'rt'), 0, 16);
    $fails = array_filter(rt_read_json($failFile) ?? [], fn($f) => ($f['until'] ?? 0) > time() || ($f['last'] ?? 0) > time() - 3600);
    $mine = $fails[$ipKey] ?? ['n' => 0, 'until' => 0, 'last' => 0];
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST' && csrf_ok()) {
        usleep(400000);
        if ($mine['until'] > time()) {
            $err = 'Too many wrong tries. Try again in ' . (int)ceil(($mine['until'] - time()) / 60) . ' minutes.';
        } elseif (password_verify((string)($_POST['pw'] ?? ''), (string)$auth['hash'])) {
            unset($fails[$ipKey]);
            rt_write_json($failFile, $fails);
            session_regenerate_id(true);
            $_SESSION['admin'] = true;
            go();
        } else {
            $mine['n']++;
            $mine['last'] = time();
            if ($mine['n'] >= 5) {
                $mine = ['n' => 0, 'until' => time() + 900, 'last' => time()];
                $err = 'Too many wrong tries. Login is locked for 15 minutes.';
                rt_notify('⚠️ RemoTap admin: 5 wrong passwords in a row. Login locked for 15 minutes.');
            } else {
                $left = 5 - $mine['n'];
                $err = "Wrong password. $left " . ($left === 1 ? 'try' : 'tries') . ' left.';
            }
            $fails[$ipKey] = $mine;
            rt_write_json($failFile, $fails);
        }
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

define('RT_ADMIN', true);
require __DIR__ . '/admin-sections/helpers.php';
require __DIR__ . '/admin-sections/downloads.php';
rt_backup_daily();

/* ---------- Actions ---------- */
if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    if (!csrf_ok()) go('', 'Session expired, please try again.');
    $action = $_POST['action'] ?? '';

    if ($action === 'status') {
        $id = (string)($_POST['id'] ?? '');
        $o = preg_match('/^RT-[0-9]{6}-[A-Z0-9]{4}$/', $id) ? rt_read_json(rt_order_path($id)) : null;
        $st = (string)($_POST['status'] ?? '');
        if ($o && isset(STATUSES[$st])) {
            adm_set_status($o, $st);
            rt_write_json(rt_order_path($id), $o);
        }
        go('tab=orders#' . $id, "Order $id marked " . (STATUSES[$st] ?? $st) . '.');
    }

    if ($action === 'save_products') {
        $site = rt_site();
        $show = [];
        $hide = [];
        foreach (RT_CATALOG as $key => $def) {
            $prices = [];
            foreach ($def['plans'] as $plan => $label) {
                $v = trim((string)($_POST['price'][$key][$plan] ?? ''));
                if ($v === '') continue; // an empty price means this plan or size is not sold
                if (!preg_match('/^\d{1,6}$/', $v)) go('tab=products', "{$def['name']} ($label): the price must be a whole number of EGP.");
                $prices[$plan] = (int)$v;
            }
            if (!$prices) continue;
            if (!empty($_POST['show'][$key])) $show[$key] = $prices;
            else $hide[$key] = $prices;
        }
        if (!$show) go('tab=products', 'Keep at least one product on the site.');
        $extra = trim((string)($_POST['extra_price'] ?? ''));
        if (!preg_match('/^\d{1,5}$/', $extra)) go('tab=products', 'The add-on price must be a whole number of EGP.');
        $site['products'] = $show;
        $site['hidden_products'] = $hide;
        $site['extra_price'] = (int)$extra;
        $ctp = [];
        foreach (RT_CARD_TYPES as $ct => $ctLabel) {
            $v = trim((string)($_POST['ctype'][$ct] ?? '0'));
            if ($v === '') $v = '0';
            if (!preg_match('/^-?\d{1,5}$/', $v)) go('tab=products', "$ctLabel: write a whole number of EGP (it can be negative).");
            $ctp[$ct] = (int)$v;
        }
        $site['card_type_price'] = $ctp;
        rt_save_site($site);
        go('tab=products', 'Prices saved. The site uses them on the next page load.');
    }

    if ($action === 'save_settings') {
        $site = rt_site();
        $wa = preg_replace('/\D/', '', (string)($_POST['whatsapp'] ?? '')) ?? '';
        if (str_starts_with($wa, '01')) $wa = '2' . $wa; // 01xxxxxxxxx -> 201xxxxxxxxx
        if (!preg_match('/^20\d{10}$/', $wa)) go('tab=settings', 'WhatsApp: write an Egyptian mobile number, e.g. 01127209609.');
        $num = preg_replace('/\D/', '', (string)($_POST['instapay_number'] ?? '')) ?? '';
        if ($num !== '' && !preg_match('/^01\d{9}$/', $num)) go('tab=settings', 'InstaPay number: write the 11-digit mobile number linked to InstaPay.');
        $handle = rt_clean($_POST['instapay_handle'] ?? '', 60);
        if ($handle !== '' && !preg_match('/^[^\s@]+@[a-z]+$/i', $handle)) go('tab=settings', 'InstaPay address should look like name@instapay.');
        $link = rt_clean($_POST['instapay_link'] ?? '', 200);
        if ($link !== '' && !preg_match('#^https://#i', $link)) go('tab=settings', 'InstaPay link must start with https://');
        foreach (['delivery_fee' => 'Delivery to Cairo and Giza', 'delivery_fee_other' => 'Delivery to other governorates'] as $k => $label) {
            $v = trim((string)($_POST[$k] ?? ''));
            if (!preg_match('/^\d{1,5}$/', $v)) go('tab=settings', "$label must be a whole number of EGP.");
            $site[$k] = (int)$v;
        }
        $max = (int)($_POST['max_quantity'] ?? 0);
        if ($max < 1 || $max > 5000) go('tab=settings', 'Largest quantity per product must be between 1 and 5000.');
        $site['whatsapp'] = $wa;
        $site['instapay_number'] = $num;
        $site['instapay_handle'] = $handle;
        $site['instapay_link'] = $link;
        $site['max_quantity'] = $max;
        rt_save_site($site);
        go('tab=settings', 'Settings saved.');
    }

    if ($action === 'make_page') {
        $id = (string)($_POST['id'] ?? '');
        $o = preg_match('/^RT-[0-9]{6}-[A-Z0-9]{4}$/', $id) ? rt_read_json(rt_order_path($id)) : null;
        if (!$o) go('tab=orders', 'Order not found.');
        if (!empty($o['profile'])) go('edit=' . $o['profile']);
        $base = rt_slugify($o['page']['print_text'] ?: $o['page']['name']) ?: strtolower($id);
        $slug = $base;
        for ($i = 2; is_file(rt_profile_path($slug)); $i++) $slug = $base . '-' . $i;
        // A free page (Basic card) never expires; a custom page (Plus card, stand or coaster add-on) is paid for 1 year.
        $custom = false;
        foreach (adm_lines($o) as $l) if (rt_item_has_page($l) && !(($l['product'] ?? '') === 'card' && ($l['plan'] ?? '') === 'basic')) $custom = true;
        $profile = [
            'slug' => $slug,
            'plan' => $o['plan'],
            'active' => true,
            'expires' => ($o['plan'] === 'plus' && $custom) ? date('Y-m-d', strtotime('+1 year')) : '',
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

    require __DIR__ . '/admin-sections/actions.php';
    go('', 'Unknown action.');
}

/* ---------- Views ---------- */
$tab = (string)($_GET['tab'] ?? 'dashboard');
if (isset($_GET['edit']) || isset($_GET['new'])) $tab = 'pages';
$month = date('Y-m');
$orders = rt_list('orders');
usort($orders, fn($a, $b) => strcmp($b['created'], $a['created']));
$profiles = rt_list('profiles');
usort($profiles, fn($a, $b) => strcmp($b['created'] ?? '', $a['created'] ?? ''));

$revMonth = array_sum(array_map(fn($o) => $o['total'], array_filter($orders, fn($o) => str_starts_with($o['created'], $month) && !in_array($o['status'], ['awaiting_payment', 'cancelled'], true))));
$tapsMonth = 0;
foreach ($profiles as $pr) { $t = rt_taps($pr['slug']); $tapsMonth += array_sum($t[$month] ?? []); }

page_head('RemoTap admin');
?>
<?php
$badges = [
    'instapay' => count(array_filter($orders, 'adm_pay_open')),
    'shipping' => count(array_filter($orders, fn($o) => in_array($o['status'], ['paid', 'printing'], true))),
    'inventory' => count(array_filter(rt_stock(), fn($s) => $s['qty'] <= $s['min'])),
    'distributors' => count(array_filter(rt_list('distributors'), fn($d) => ($d['status'] ?? 'new') === 'new')),
    'reviews' => count(array_filter(rt_reviews(), fn($r) => empty($r['shown']) && ($r['source'] ?? '') === 'Website')),
];
$tabKnown = isset(ADM_MENU[$tab]) || isset(ADM_MENU_STORE[$tab]) ? $tab : 'orders';
?>
<div class="shell">
<aside class="side">
  <div class="brand"><img src="assets/img/mark-64.png" alt="" width="30"><span class="wordmark">REMO<span class="t">T</span><span class="ap">AP</span></span></div>
  <button type="button" class="refresh" id="rt-refresh" title="Load the newest orders and counts without reloading the page"><span class="ico" aria-hidden="true">↻</span> <span class="lbl">Refresh</span></button>
  <nav aria-label="Admin">
    <?php foreach (ADM_MENU as $k => $label): ?>
      <a class="<?= $tabKnown === $k ? 'on' : '' ?>" href="?tab=<?= $k ?>"<?= $tabKnown === $k ? ' aria-current="page"' : '' ?>><?= h($label) ?><?php if (!empty($badges[$k])): ?><span class="badge"><?= $badges[$k] ?></span><?php endif; ?></a>
    <?php endforeach; ?>
    <span class="navlabel">Store</span>
    <?php foreach (ADM_MENU_STORE as $k => $label): ?>
      <a class="<?= $tabKnown === $k ? 'on' : '' ?>" href="?tab=<?= $k ?>"<?= $tabKnown === $k ? ' aria-current="page"' : '' ?>><?= h($label) ?></a>
    <?php endforeach; ?>
    <span class="navlabel"></span>
    <a href="index.html" target="_blank">View site ↗</a>
    <a href="?logout=1">Log out</a>
  </nav>
</aside>
<section class="main">
<?php if ($flash): ?><div class="flash"><?= h($flash) ?></div><?php endif; ?>

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
/* ---------- Dashboard, InstaPay, shipping, inventory, codes, customers, reviews, reports, distributors ---------- */
elseif (in_array($tab, ADM_SECTIONS, true)):
    require __DIR__ . '/admin-sections/views.php';

/* ---------- Products and prices ---------- */
elseif ($tab === 'products'):
    $site = rt_site();
    $shown = $site['products'] ?? [];
    $hidden = $site['hidden_products'] ?? [];
?>
  <div class="panel">
    <div class="head"><h2>Products &amp; prices</h2><a class="btn btn-ghost btn-sm" href="shop.html" target="_blank">See the shop ↗</a></div>
    <p class="muted" style="margin:-4px 0 16px">Prices in EGP. Leave a price empty to stop selling that plan or size. Hidden products keep their prices for later. Every save keeps a backup of the old prices.</p>
    <form method="post">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="save_products">
      <div class="scroll">
        <table class="tbl prices">
          <thead><tr><th>Product</th><th>On the site</th><th colspan="2">Price per piece</th></tr></thead>
          <tbody>
          <?php foreach (RT_CATALOG as $key => $def):
            $cur = $shown[$key] ?? $hidden[$key] ?? []; ?>
            <tr>
              <td><b><?= h($def['name']) ?></b><br><a class="muted" href="product/<?= h($key) ?>.html" target="_blank">/product/<?= h($key) ?></a></td>
              <td><label class="check"><input type="checkbox" name="show[<?= h($key) ?>]" value="1" <?= isset($shown[$key]) ? 'checked' : '' ?>> Show</label></td>
              <?php foreach ($def['plans'] as $plan => $label): ?>
                <td><label class="price-in"><span><?= h($label) ?></span><input class="input" name="price[<?= h($key) ?>][<?= h($plan) ?>]" inputmode="numeric" value="<?= isset($cur[$plan]) ? (int)$cur[$plan] : '' ?>" placeholder="not sold"></label></td>
              <?php endforeach; ?>
              <?php if (count($def['plans']) === 1): ?><td></td><?php endif; ?>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
      </div>
      <div class="field-row">
        <label class="price-in"><span>Each add-on on stands and coasters (custom design, landing page)</span><input class="input" name="extra_price" inputmode="numeric" value="<?= (int)($site['extra_price'] ?? 20) ?>"></label>
      </div>
      <h3 class="h3">Card types</h3>
      <p class="muted small" style="margin:0 0 10px">The Card prices above are for the PVC card. Write how much each other type adds (or takes off, with a minus). It is added to Basic and Plus.</p>
      <div class="field-row" style="display:flex;gap:14px;flex-wrap:wrap">
        <?php foreach (RT_CARD_TYPES as $ct => $ctLabel): ?>
          <label class="price-in"><span><?= h($ctLabel) ?> (EGP)</span><input class="input" name="ctype[<?= h($ct) ?>]" inputmode="numeric" value="<?= (int)($site['card_type_price'][$ct] ?? 0) ?>"></label>
        <?php endforeach; ?>
      </div>
      <button class="btn">Save prices</button>
    </form>
  </div>

<?php
/* ---------- Settings ---------- */
elseif ($tab === 'settings'):
    $site = rt_site();
    $ph = ($site['instapay_number'] ?? '') === '01000000000' || ($site['instapay_handle'] ?? '') === 'remotap@instapay';
?>
  <div class="panel">
    <div class="head"><h2>Settings</h2></div>
    <?php if ($ph): ?><p class="warnbox">InstaPay details are still the sample ones. Customers see them at checkout as where to send money, so add your real details before going live.</p><?php endif; ?>
    <form method="post" class="settings">
      <input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="save_settings">
      <fieldset><legend>Contact</legend>
        <label for="s-wa">WhatsApp number (orders and questions arrive here)</label>
        <input class="input ltr" id="s-wa" name="whatsapp" inputmode="tel" value="<?= h('0' . substr((string)($site['whatsapp'] ?? ''), 2)) ?>" placeholder="01xxxxxxxxx">
      </fieldset>
      <fieldset><legend>InstaPay (shown at checkout)</legend>
        <label for="s-ih">InstaPay address</label>
        <input class="input ltr" id="s-ih" name="instapay_handle" value="<?= h($site['instapay_handle'] ?? '') ?>" placeholder="name@instapay">
        <label for="s-in">Mobile number linked to InstaPay</label>
        <input class="input ltr" id="s-in" name="instapay_number" inputmode="tel" value="<?= h($site['instapay_number'] ?? '') ?>" placeholder="01xxxxxxxxx">
        <label for="s-il">InstaPay payment link (optional)</label>
        <input class="input ltr" id="s-il" name="instapay_link" value="<?= h($site['instapay_link'] ?? '') ?>" placeholder="https://ipn.eg/...">
      </fieldset>
      <fieldset><legend>Delivery (EGP)</legend>
        <div class="two">
          <div><label for="s-d1">Cairo and Giza</label><input class="input" id="s-d1" name="delivery_fee" inputmode="numeric" value="<?= (int)($site['delivery_fee'] ?? 0) ?>"></div>
          <div><label for="s-d2">Other governorates</label><input class="input" id="s-d2" name="delivery_fee_other" inputmode="numeric" value="<?= (int)($site['delivery_fee_other'] ?? $site['delivery_fee'] ?? 0) ?>"></div>
        </div>
      </fieldset>
      <fieldset><legend>Orders</legend>
        <label for="s-max">Largest quantity per product in one online order</label>
        <input class="input" id="s-max" name="max_quantity" inputmode="numeric" value="<?= (int)($site['max_quantity'] ?? 20) ?>">
      </fieldset>
      <button class="btn">Save settings</button>
    </form>
  </div>

  <?php $notify = rt_read_json(RT_DATA . '/notify.json') ?? []; ?>
  <div class="panel">
    <div class="head"><h2>Phone alerts (Telegram)</h2><?php if (!empty($notify['telegram_token'])): ?><span class="pill ok">On</span><?php else: ?><span class="pill off">Off</span><?php endif; ?></div>
    <p class="muted" style="margin-top:0">Get a Telegram message for every new order, every “I've sent the money” and every distributor request. Free, and it works even when email doesn't.</p>
    <ol class="muted small" style="margin:0 0 14px;padding-left:18px;line-height:1.7">
      <li>In Telegram, open <b>@BotFather</b>, send <code>/newbot</code>, pick any name. It gives you a token like <code>123456:ABC…</code>.</li>
      <li>Open your new bot and press <b>Start</b>, then open <b>@userinfobot</b> and press Start: it shows your chat id (a number).</li>
      <li>Paste both here, save, then press “Send test message”.</li>
    </ol>
    <form method="post" class="settings"><?= adm_form('save_notify') ?>
      <label for="n-tok">Bot token</label>
      <input class="input ltr" id="n-tok" name="telegram_token" autocomplete="off" placeholder="<?= !empty($notify['telegram_token']) ? 'Saved. Leave empty to keep it' : '123456789:ABC…' ?>">
      <label for="n-chat">Your chat id</label>
      <input class="input ltr" id="n-chat" name="telegram_chat" value="<?= h($notify['telegram_chat'] ?? '') ?>" placeholder="123456789">
      <?php if (!empty($notify['telegram_token'])): ?><label class="check"><input type="checkbox" name="off" value="1"> Turn alerts off (deletes the token)</label><?php endif; ?>
      <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn">Save alerts</button><?php if (!empty($notify['telegram_token'])): ?><button class="btn btn-ghost" name="action" value="notify_test">Send test message</button><?php endif; ?></div>
    </form>
  </div>

  <?php $backups = glob(RT_DATA . '/backups/data-*.zip') ?: []; rsort($backups); ?>
  <div class="panel">
    <div class="head"><h2>Backups</h2><a class="btn btn-sm" href="?backup=1">Download all data now</a></div>
    <p class="muted" style="margin-top:0">The admin keeps one copy of all orders, pages, codes, stock, reviews and requests per day (the last 14 days) in <code>data/backups</code>. Download a copy to your computer once a week too, in case the hosting account itself is lost.</p>
    <?php if ($backups): ?><p class="small">Latest daily copies: <?= h(implode(' · ', array_map(fn($f) => date('j M', strtotime(substr(basename($f, '.zip'), 5))) . ' (' . max(1, (int)round(filesize($f) / 1024)) . ' KB)', array_slice($backups, 0, 7)))) ?></p><?php elseif (!class_exists('ZipArchive')): ?><p class="warnbox">This server's PHP has no zip extension, so daily copies can't be made. Ask the host to turn on “zip”.</p><?php endif; ?>
  </div>

<?php
/* ---------- Orders ---------- */
else:
    $filter = isset(STATUSES[$_GET['status'] ?? '']) ? $_GET['status'] : '';
    $q = mb_strtolower(trim((string)($_GET['q'] ?? '')));
    $counts = [];
    foreach ($orders as $o) $counts[$o['status']] = ($counts[$o['status']] ?? 0) + 1;
    $list = array_values(array_filter($orders, function ($o) use ($filter, $q) {
        if ($filter !== '' && $o['status'] !== $filter) return false;
        if ($q === '') return true;
        $hay = mb_strtolower($o['id'] . ' ' . $o['customer']['name'] . ' ' . $o['customer']['phone'] . ' ' . ($o['page']['name'] ?? ''));
        return str_contains($hay, $q);
    }));
    $keepQ = $q !== '' ? '&q=' . urlencode($q) : '';
?>
  <div class="panel">
    <div class="head"><h2>Orders</h2><span class="muted"><?= count($list) ?> of <?= count($orders) ?> · <a href="?export=orders">Download all as Excel (CSV)</a></span></div>
    <div class="filters">
      <a class="chip <?= $filter === '' ? 'on' : '' ?>" href="?tab=orders<?= h($keepQ) ?>">All <?= count($orders) ?></a>
      <?php foreach (STATUSES as $k => $v): ?>
        <a class="chip <?= $filter === $k ? 'on' : '' ?>" href="?tab=orders&amp;status=<?= $k ?><?= h($keepQ) ?>"><?= h($v) ?> <?= (int)($counts[$k] ?? 0) ?></a>
      <?php endforeach; ?>
      <form method="get" class="search"><input type="hidden" name="tab" value="orders"><?php if ($filter): ?><input type="hidden" name="status" value="<?= h($filter) ?>"><?php endif; ?><input class="input" type="search" name="q" value="<?= h($q) ?>" placeholder="Search name, phone or order no." aria-label="Search orders"></form>
    </div>
    <?php $src = []; foreach ($orders as $o) { if ($o['status'] === 'cancelled') continue; $k = $o['source'] ?? 'direct'; $src[$k] = ($src[$k] ?? 0) + 1; } arsort($src);
      if ($src): ?><p class="muted" style="margin:-4px 0 14px">Where orders come from: <?= h(implode(' · ', array_map(fn($k, $v) => "$k $v", array_keys($src), $src))) ?></p><?php endif; ?>
    <?php if (!$orders): ?><p class="muted">No orders yet. They appear here as soon as someone orders on the site.</p><?php elseif (!$list): ?><p class="muted">No orders match this filter. <a href="?tab=orders">Show all orders</a></p><?php endif; ?>
    <?php foreach ($list as $o): $c = $o['customer']; ?>
      <details class="order" id="<?= h($o['id']) ?>" <?= $o['status'] === 'awaiting_payment' ? 'open' : '' ?>>
        <summary>
          <span class="st st-<?= h($o['status']) ?>"><?= h(STATUSES[$o['status']] ?? $o['status']) ?></span>
          <b class="ltr"><?= h($o['id']) ?></b>
          <span><?= h($c['name']) ?></span>
          <span class="muted"><?php if (!empty($o['items'])): ?><?= h(implode(' + ', array_map(fn($i) => ucfirst($i['product']) . ' ' . rt_plan_label($i['product'], $i['plan']) . (!empty($i['extras']) ? ' + ' . implode(', ', $i['extras']) : '') . ' × ' . (int)$i['qty'], $o['items']))) ?><?php else: ?><?= h(ucfirst($o['product'])) ?> · <?= h(ucfirst($o['plan'])) ?> × <?= (int)$o['qty'] ?><?php endif; ?></span>
          <b class="amt"><?= number_format((int)$o['total']) ?> EGP</b>
          <?= adm_pay_pill($o) ?>
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
              <?php foreach ($o['items'] as $i): ?><p><span class="muted"><?= h(ucfirst($i['product']) . ' ' . rt_plan_label($i['product'], $i['plan'])) ?><?= $i['design'] ? ' · look: ' . h($i['design']) : '' ?><?= !empty($i['extras']) ? ' · add-ons: ' . h(implode(', ', $i['extras'])) : '' ?></span> <?= (int)$i['unit_price'] ?> × <?= (int)$i['qty'] ?></p><?php endforeach; ?>
              <p><span class="muted">Delivery</span> <?= (int)$o['delivery_fee'] ?></p>
            <?php else: ?>
            <p><span class="muted">Price</span> <?= (int)$o['unit_price'] ?> × <?= (int)$o['qty'] ?> + <?= (int)$o['delivery_fee'] ?> delivery</p>
            <?php endif; ?>
            <?php if (!empty($o['coupon'])): ?><p><span class="muted">Discount code</span> <?= h($o['coupon']) ?> (−<?= (int)($o['discount'] ?? 0) ?>)</p><?php endif; ?>
            <?php $pay = rt_pay($o); ?>
            <div class="paybox">
              <p style="margin:0 0 8px"><span class="muted">InstaPay</span> <?= adm_pay_pill($o) ?><?= !empty($pay['ref']) ? ' <span class="small">ref ' . h($pay['ref']) . '</span>' : '' ?></p>
              <?php if (!empty($pay['proof'])): ?><p style="margin:0 0 8px"><a href="?proof=<?= h($pay['proof']) ?>" target="_blank"><img src="?proof=<?= h($pay['proof']) ?>" alt="Payment screenshot" class="proof-thumb"></a></p><?php endif; ?>
              <?php if (adm_pay_open($o)): ?>
                <form method="post" class="payform"><?= adm_form('pay_confirm', ['id' => $o['id'], 'back' => 'orders']) ?>
                  <input class="input" name="ref" value="<?= h($pay['ref'] ?? '') ?>" placeholder="Reference (optional)" aria-label="Transfer reference">
                  <button class="btn btn-sm">Confirm transfer</button>
                  <?php if ($pay['status'] === 'awaiting'): ?><button class="btn btn-ghost btn-sm" name="action" value="pay_sent">Customer sent it</button><?php endif; ?>
                  <button class="btn btn-ghost btn-sm danger" name="action" value="pay_reject" onclick="return confirm('Reject this transfer? The order stays unpaid.')">Reject</button>
                </form>
              <?php endif; ?>
            </div>
            <?php if (!empty($o['shipping']['courier'])): ?><p><span class="muted">Shipped with</span> <?= h($o['shipping']['courier']) ?><?= !empty($o['shipping']['tracking']) ? ' · <span class="ltr">' . h($o['shipping']['tracking']) . '</span>' : '' ?></p><?php endif; ?>
            <form method="post" class="status-form">
              <input type="hidden" name="csrf" value="<?= h($csrf) ?>"><input type="hidden" name="action" value="status"><input type="hidden" name="id" value="<?= h($o['id']) ?>">
              <select class="input" name="status"><?php foreach (STATUSES as $k => $v): ?><option value="<?= $k ?>" <?= $o['status'] === $k ? 'selected' : '' ?>><?= $v ?></option><?php endforeach; ?></select>
              <button class="btn btn-sm">Update</button>
              <a class="btn btn-ghost btn-sm" href="?slip=<?= h($o['id']) ?>" target="_blank">Packing slip</a>
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
</section>
</div>

<script>
// Refresh button: loads the current page again in the background and swaps in the new content and sidebar counts.
(function () {
  var btn = document.getElementById('rt-refresh');
  if (!btn) return;
  var lbl = btn.querySelector('.lbl');
  btn.addEventListener('click', function () {
    if (/[?&](edit|new)=/.test(location.search)) { location.reload(); return; } // the page editor has its own scripts
    btn.classList.add('spin'); btn.disabled = true;
    fetch(location.pathname + location.search, { credentials: 'same-origin', cache: 'no-store' })
      .then(function (r) { return r.text(); })
      .then(function (html) {
        var d = new DOMParser().parseFromString(html, 'text/html');
        var m = d.querySelector('.main'), n = d.querySelector('.side nav');
        if (!m || !n) { location.reload(); return; }
        document.querySelector('.main').innerHTML = m.innerHTML;
        document.querySelector('.side nav').innerHTML = n.innerHTML;
        var t = new Date();
        lbl.textContent = 'Updated ' + String(t.getHours()).padStart(2, '0') + ':' + String(t.getMinutes()).padStart(2, '0');
      })
      .catch(function () { location.reload(); })
      .then(function () { btn.classList.remove('spin'); btn.disabled = false; });
  });
})();
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
.wrap{max-width:1440px}
.shell{display:grid;grid-template-columns:230px minmax(0,1fr);gap:26px;align-items:start}
.side{position:sticky;top:20px;display:grid;gap:18px}.side .brand{gap:10px;padding:4px 10px}
.side nav{display:grid;gap:2px}.side nav a{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:10px;color:var(--muted);font-size:.92rem}.side nav a.on,.side nav a:hover{background:var(--surface-2);color:#fff}
.navlabel{display:block;margin:14px 12px 4px;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;color:var(--faint)}
.badge{min-width:22px;padding:1px 7px;border-radius:99px;background:rgba(255,184,77,.18);color:#ffc971;font-size:.72rem;font-weight:700;text-align:center}
.main{min-width:0;display:grid;grid-template-columns:minmax(0,1fr);gap:18px;align-content:start}.grid2>*{min-width:0}td a.ltr,td .ltr{white-space:nowrap}.main>.panel{margin:0}
.h1{font-size:1.5rem;text-transform:none;margin:0}.h3{font-size:1rem;text-transform:none;margin:20px 0 8px}
@media(max-width:900px){.shell{grid-template-columns:1fr}.side{position:static}.side nav{display:flex;overflow-x:auto;gap:4px;padding-bottom:4px}.side nav a{white-space:nowrap}.navlabel{display:none}}
.small{font-size:.8rem}.nowrap{white-space:nowrap}.plain{list-style:none;padding:0;margin:0;display:grid;gap:10px}
.pay{font-size:.72rem;font-weight:700;padding:4px 10px;border-radius:99px;background:var(--surface-2);white-space:nowrap}.pay-awaiting{background:rgba(255,184,77,.16);color:#ffc971}.pay-sent{background:rgba(55,118,255,.2);color:#a9c3ff}.pay-confirmed{background:rgba(62,224,143,.15);color:#7ff0b5}.pay-rejected{background:rgba(255,92,120,.16);color:#ff9fb1}.pay-off{color:var(--faint)}
.paybox{margin:12px 0;padding:12px;border:1px solid var(--line);border-radius:12px}
.payform,.shipform{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.payform .input,.shipform .input{min-height:36px;padding:4px 10px;width:auto;max-width:180px;font-size:.85rem}
.shiprow{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:14px 0;border-bottom:1px solid var(--line)}.shiprow:last-child{border-bottom:0}
.actions{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.danger{color:#ff9fb1}
.stock .num{max-width:110px;min-height:38px;padding:4px 10px}
.pill.ok{background:rgba(62,224,143,.15);color:#7ff0b5}.pill.bad{background:rgba(255,92,120,.16);color:#ff9fb1}.pill.d-new{background:rgba(255,184,77,.16);color:#ffc971}.pill.d-contacted{background:rgba(55,118,255,.2);color:#a9c3ff}.pill.d-approved{background:rgba(62,224,143,.15);color:#7ff0b5}.pill.d-rejected{color:var(--faint)}
.review{padding:14px 0;border-bottom:1px solid var(--line)}.review p{margin:8px 0}.stars{color:#ffc971;letter-spacing:2px}
.barcol{width:30%}.bar{display:block;height:8px;border-radius:99px;background:linear-gradient(90deg,#3776ff,#00e5ff);min-width:2px}
.flash{padding:12px 16px;border-radius:12px;background:rgba(62,224,143,.12);border:1px solid rgba(62,224,143,.35);margin-bottom:16px}
.kpis{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}.kpis>*{display:block;padding:16px;border-radius:16px;background:var(--surface);border:1px solid var(--line);color:inherit}.kpis a:hover{border-color:rgba(0,229,255,.4)}.kpis span{display:block;color:var(--muted);font-size:.8rem}.kpis b{display:block;font-family:Michroma,sans-serif;font-size:1.3rem;margin-top:4px}.kpis em{display:block;font-style:normal;color:var(--faint);font-size:.75rem;margin-top:4px}
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
.filters{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 16px}.chip{padding:7px 12px;border-radius:99px;border:1px solid var(--line);color:var(--muted);font-size:.85rem}.chip.on,.chip:hover{background:var(--surface-2);color:#fff}.search{margin-left:auto;min-width:220px;flex:1;max-width:340px}.search .input{min-height:40px;padding:6px 12px}
.prices td{vertical-align:middle}.price-in{display:grid;gap:4px;font-size:.8rem;color:var(--muted)}.price-in .input{min-height:42px;padding:6px 12px;max-width:140px}.field-row{margin:18px 0}
.settings{display:grid;gap:18px;max-width:560px}.settings fieldset{border:1px solid var(--line);border-radius:14px;padding:16px;display:grid;gap:8px}.settings legend{padding:0 6px;font-weight:700}.settings label{font-size:.85rem;color:var(--muted);margin-top:6px}.settings .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}.settings .btn{justify-self:start}
.warnbox{padding:12px 16px;border-radius:12px;background:rgba(255,184,77,.12);border:1px solid rgba(255,184,77,.4);color:#ffd99a;margin-bottom:16px}
.refresh{display:flex;align-items:center;justify-content:center;gap:8px;padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--muted);cursor:pointer;font:inherit;font-size:.88rem}.refresh:hover{color:#fff;background:var(--surface-2)}.refresh .ico{display:inline-block;font-size:1.05rem}.refresh.spin .ico{animation:rtspin .8s linear infinite}@keyframes rtspin{to{transform:rotate(360deg)}}
.proof-thumb{max-width:180px;max-height:180px;border-radius:10px;border:1px solid var(--line);display:block}
.qr{background:#fff;padding:12px;border-radius:14px;width:max-content;margin:6px 0 12px}.logo-thumb{width:90px;height:90px;object-fit:cover;border-radius:12px;border:1px solid var(--line)}
</style></head><body><div class="atmos" aria-hidden="true"></div><main class="wrap">
<?php }

function page_foot(): void { ?>
</main></body></html>
<?php }
