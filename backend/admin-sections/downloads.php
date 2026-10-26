<?php
// Admin GET pages that are not part of the normal layout: payment screenshots, CSV export,
// packing slips and the data backup download. Included by admin.php after login only.
declare(strict_types=1);
if (!defined('RT_ADMIN')) { http_response_code(403); exit; }

/* ---------- Payment screenshot (stored privately in data/proofs) ---------- */
if (isset($_GET['proof'])) {
    $name = (string)$_GET['proof'];
    $f = RT_DATA . '/proofs/' . $name;
    if (!preg_match('/^\d{8}-[a-f0-9]{16}\.(jpg|png|webp)$/', $name) || !is_file($f)) { http_response_code(404); exit('Not found'); }
    header('Content-Type: ' . ['jpg' => 'image/jpeg', 'png' => 'image/png', 'webp' => 'image/webp'][pathinfo($name, PATHINFO_EXTENSION)]);
    header('Content-Length: ' . filesize($f));
    readfile($f);
    exit;
}

/* ---------- Orders as CSV (opens in Excel; UTF-8 with BOM so Arabic names show) ---------- */
if (($_GET['export'] ?? '') === 'orders') {
    $orders = rt_list('orders');
    usort($orders, fn($a, $b) => strcmp($b['created'], $a['created']));
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename="remotap-orders-' . date('Y-m-d') . '.csv"');
    $out = fopen('php://output', 'w');
    fwrite($out, "\xEF\xBB\xBF");
    fputcsv($out, ['Order', 'Date', 'Status', 'InstaPay', 'Reference', 'Customer', 'Phone', 'Email', 'Area', 'Address', 'Items', 'Pieces', 'Products (EGP)', 'Discount code', 'Discount (EGP)', 'Delivery (EGP)', 'Total (EGP)', 'Courier', 'Tracking', 'Came from']);
    foreach ($orders as $o) {
        $c = $o['customer'];
        $p = rt_pay($o);
        $lines = adm_lines($o);
        fputcsv($out, [
            $o['id'], date('Y-m-d H:i', strtotime($o['created'])), STATUSES[$o['status']] ?? $o['status'], RT_PAY_STATUSES[$p['status']] ?? $p['status'], $p['ref'] ?? '',
            $c['name'], $c['phone'], $c['email'] ?? '', ucfirst($c['area']), $c['address'],
            adm_items_text($o), array_sum(array_map(fn($i) => (int)$i['qty'], $lines)),
            array_sum(array_map(fn($i) => (int)$i['unit_price'] * (int)$i['qty'], $lines)),
            $o['coupon'] ?? '', (int)($o['discount'] ?? 0), (int)$o['delivery_fee'], (int)$o['total'],
            $o['shipping']['courier'] ?? '', $o['shipping']['tracking'] ?? '', $o['source'] ?? 'direct',
        ]);
    }
    fclose($out);
    exit;
}

/* ---------- All data as a zip ---------- */
if (isset($_GET['backup'])) {
    $tmp = RT_DATA . '/backups/download-' . bin2hex(random_bytes(4)) . '.zip';
    if (!is_dir(dirname($tmp))) mkdir(dirname($tmp), 0755, true);
    if (rt_backup_zip($tmp) === '') { http_response_code(500); exit('This server cannot make zip files (the PHP zip extension is off). Ask the host to turn it on.'); }
    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="remotap-data-' . date('Y-m-d') . '.zip"');
    header('Content-Length: ' . filesize($tmp));
    readfile($tmp);
    @unlink($tmp);
    exit;
}

/* ---------- Packing slip: one printable page per order ---------- */
if (isset($_GET['slip'])) {
    $o = adm_order((string)$_GET['slip']);
    if (!$o) { http_response_code(404); exit('Order not found'); }
    $c = $o['customer'];
    $p = rt_pay($o);
    $site = rt_site();
    ?><!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>Packing slip <?= h($o['id']) ?></title>
<style>
*{box-sizing:border-box}body{font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#111;background:#fff;margin:0 auto;padding:28px;max-width:760px}
h1{font-size:20px;margin:0}.top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #111;padding-bottom:14px;margin-bottom:18px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:18px}.box{border:1px solid #bbb;border-radius:8px;padding:12px}.box b{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#555;margin-bottom:4px}
table{width:100%;border-collapse:collapse;margin-bottom:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid #ddd}th{font-size:12px;text-transform:uppercase;color:#555}td.n,th.n{text-align:right}
.tot td{border:0;padding:4px 8px}.tot .big td{font-weight:700;font-size:17px;border-top:2px solid #111}.check{display:inline-block;width:14px;height:14px;border:1.5px solid #111;vertical-align:-2px}
.print{position:fixed;top:14px;right:14px;padding:10px 18px;border:0;border-radius:99px;background:#111;color:#fff;font-weight:600;cursor:pointer}@media print{.print{display:none}body{padding:0}}
@media(max-width:560px){.grid{grid-template-columns:1fr}}
</style></head><body>
<button class="print" onclick="print()">Print</button>
<div class="top">
  <div><h1>RemoTap</h1><div>Packing slip</div></div>
  <div style="text-align:right"><b style="font-size:18px"><?= h($o['id']) ?></b><br><?= h(date('j M Y', strtotime($o['created']))) ?><br>WhatsApp <?= h('0' . substr((string)($site['whatsapp'] ?? ''), 2)) ?></div>
</div>
<div class="grid">
  <div class="box"><b>Deliver to</b><?= h($c['name']) ?><br><?= h($c['phone']) ?><br><?= h(ucfirst($c['area'])) ?>, <?= h($c['address']) ?><?php if (!empty($c['notes'])): ?><br><i><?= h($c['notes']) ?></i><?php endif; ?></div>
  <div class="box"><b>Payment</b>InstaPay: <?= h(RT_PAY_STATUSES[$p['status']] ?? $p['status']) ?><?= !empty($p['ref']) ? '<br>Ref ' . h($p['ref']) : '' ?><?php if (!empty($o['shipping']['courier'])): ?><b style="margin-top:10px">Courier</b><?= h($o['shipping']['courier']) ?> <?= h($o['shipping']['tracking'] ?? '') ?><?php endif; ?></div>
</div>
<table>
  <thead><tr><th>Packed</th><th>Item</th><th>Look / add-ons</th><th class="n">Qty</th><th class="n">Price</th></tr></thead>
  <tbody>
  <?php foreach (adm_lines($o) as $i): $look = trim(($i['design'] ?? '') . (!empty($i['extras']) ? ' + ' . implode(', ', $i['extras']) : ''), ' +'); ?>
    <tr><td><span class="check"></span></td><td><?= h((RT_CATALOG[$i['product']]['name'] ?? ucfirst($i['product'])) . ' · ' . rt_plan_label($i['product'], $i['plan'])) ?></td><td><?= $look !== '' ? h($look) : '—' ?></td><td class="n"><?= (int)$i['qty'] ?></td><td class="n"><?= number_format((int)$i['unit_price'] * (int)$i['qty']) ?></td></tr>
  <?php endforeach; ?>
  </tbody>
</table>
<table class="tot">
  <?php if (!empty($o['discount'])): ?><tr><td class="n">Discount <?= h($o['coupon'] ?? '') ?></td><td class="n" style="width:120px">−<?= number_format((int)$o['discount']) ?></td></tr><?php endif; ?>
  <tr><td class="n">Delivery</td><td class="n" style="width:120px"><?= number_format((int)$o['delivery_fee']) ?></td></tr>
  <tr class="big"><td class="n">Total EGP</td><td class="n"><?= number_format((int)$o['total']) ?></td></tr>
</table>
<div class="box"><b>Print on product</b><?= h($o['page']['print_text'] ?? '') ?><?php if (!empty($o['profile'])): ?><b style="margin-top:10px">Chip link</b><?= h(rt_base_url() . '/p/' . $o['profile']) ?>?s=n<?php endif; ?></div>
</body></html>
<?php
    exit;
}
