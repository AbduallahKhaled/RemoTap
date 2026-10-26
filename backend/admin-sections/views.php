<?php
// Admin views for the store sections. Included by admin.php for the tabs in ADM_SECTIONS.
// Uses $tab, $orders (newest first), $profiles, $month, $tapsMonth and $revMonth from admin.php.
declare(strict_types=1);
if (!defined('RT_ADMIN')) { http_response_code(403); exit; }

/* ---------- Extra services ---------- */
if ($tab === 'services'):
    $site = rt_site();
    $sv = $site['services'] ?? [];
?>
  <div class="head"><h1 class="h1">Extra services</h1><a class="btn btn-ghost btn-sm" href="services.html" target="_blank">See the Services page ↗</a></div>
  <div class="panel">
    <p class="muted" style="margin-top:0">The prices customers see on the Services page. Leave a price empty to show “Price on request”. Untick a service to hide it. Customers ask for a service with a WhatsApp message; you agree the details with them there.</p>
    <form method="post"><?= adm_form('save_services') ?>
      <div class="scroll"><table class="tbl prices">
        <thead><tr><th>Service</th><th>On the site</th><th>Price from (EGP)</th></tr></thead>
        <tbody>
        <?php foreach (RT_SERVICES as $k => $label): $row = $sv[$k] ?? ['price' => null, 'show' => true]; ?>
          <tr>
            <td><b><?= h($label) ?></b></td>
            <td><label class="check"><input type="checkbox" name="show[<?= h($k) ?>]" value="1" <?= ($row['show'] ?? true) !== false ? 'checked' : '' ?>> Show</label></td>
            <td><label class="price-in"><input class="input" name="price[<?= h($k) ?>]" inputmode="numeric" value="<?= isset($row['price']) ? (int)$row['price'] : '' ?>" placeholder="Price on request" aria-label="<?= h($label) ?> price"></label></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table></div>
      <button class="btn" style="margin-top:16px">Save services</button>
    </form>
  </div>

<?php
/* ---------- Dashboard ---------- */
elseif ($tab === 'dashboard'):
    $today = date('Y-m-d');
    $payOpen = array_values(array_filter($orders, 'adm_pay_open'));
    $paySent = count(array_filter($payOpen, fn($o) => rt_pay($o)['status'] === 'sent'));
    $toShip = array_values(array_filter($orders, fn($o) => in_array($o['status'], ['paid', 'printing'], true)));
    $onWay = count(array_filter($orders, fn($o) => $o['status'] === 'shipped'));
    $ordersMonth = count(array_filter($orders, fn($o) => str_starts_with($o['created'], $month) && $o['status'] !== 'cancelled'));
    $ordersToday = count(array_filter($orders, fn($o) => str_starts_with($o['created'], $today)));
    $stock = rt_stock();
    $reserved = rt_stock_reserved($orders);
    $low = array_filter($stock, fn($s) => $s['qty'] <= $s['min']);
    $dists = rt_list('distributors');
    $newDists = count(array_filter($dists, fn($d) => ($d['status'] ?? 'new') === 'new'));
?>
  <div class="head"><h1 class="h1">Dashboard</h1><span class="muted"><?= h(date('l j F Y')) ?></span></div>
  <div class="kpis">
    <a href="?tab=instapay"><span>InstaPay to confirm</span><b><?= count($payOpen) ?></b><em><?= $paySent ?> say they sent it</em></a>
    <a href="?tab=shipping"><span>Ready to ship</span><b><?= count($toShip) ?></b><em><?= $onWay ?> on the way</em></a>
    <a href="?tab=reports"><span>Paid revenue this month</span><b><?= adm_money($revMonth) ?></b><em><?= $ordersMonth ?> orders this month · <?= $ordersToday ?> today</em></a>
    <a href="?tab=pages"><span>Taps this month</span><b><?= number_format($tapsMonth) ?></b><em><?= count(array_filter($profiles, fn($p) => !empty($p['active']))) ?> live pages</em></a>
    <a href="?tab=inventory"><span>Low stock</span><b><?= count($low) ?></b><em>items at or under their line</em></a>
    <a href="?tab=distributors"><span>Distributor requests</span><b><?= $newDists ?></b><em>new, not contacted yet</em></a>
  </div>

  <div class="grid2">
    <div class="panel">
      <div class="head"><h2>InstaPay transfers to confirm</h2><a class="btn btn-ghost btn-sm" href="?tab=instapay">All transfers</a></div>
      <?php if (!$payOpen): ?><p class="muted">Nothing waiting. New orders show here until you confirm their transfer.</p><?php else: ?>
      <div class="scroll"><table class="tbl">
        <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>InstaPay</th><th></th></tr></thead>
        <tbody>
        <?php foreach (array_slice($payOpen, 0, 6) as $o): ?>
          <tr>
            <td><?= adm_order_link($o['id']) ?><br><span class="muted small"><?= h(date('j M, H:i', strtotime($o['created']))) ?></span></td>
            <td><?= h($o['customer']['name']) ?></td>
            <td class="nowrap"><?= adm_money((int)$o['total']) ?></td>
            <td><?= adm_pay_pill($o) ?></td>
            <td><form method="post"><?= adm_form('pay_confirm', ['id' => $o['id'], 'back' => 'dashboard']) ?><button class="btn btn-sm">Confirm</button></form></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table></div>
      <?php endif; ?>
    </div>

    <div class="panel">
      <div class="head"><h2>Ready to ship</h2><a class="btn btn-ghost btn-sm" href="?tab=shipping">Shipping</a></div>
      <?php if (!$toShip): ?><p class="muted">No paid orders waiting to ship.</p><?php else: ?>
      <ul class="plain">
        <?php foreach (array_slice($toShip, 0, 6) as $o): ?>
          <li><?= adm_order_link($o['id']) ?> · <?= h($o['customer']['name']) ?> · <span class="muted"><?= h(ucfirst($o['customer']['area'])) ?></span><br><span class="muted small"><?= h(adm_items_text($o)) ?></span></li>
        <?php endforeach; ?>
      </ul>
      <?php endif; ?>
      <?php if ($low): ?>
        <h3 class="h3">Low stock</h3>
        <ul class="plain">
          <?php foreach ($low as $k => $s): ?><li><?= h(rt_stock_items()[$k] ?? $k) ?>: <b><?= (int)$s['qty'] ?></b> <span class="muted">(line <?= (int)$s['min'] ?>, <?= (int)$reserved[$k] ?> needed for paid orders)</span></li><?php endforeach; ?>
        </ul>
      <?php endif; ?>
    </div>
  </div>

  <div class="panel">
    <div class="head"><h2>Latest orders</h2><a class="btn btn-ghost btn-sm" href="?tab=orders">All orders</a></div>
    <?php if (!$orders): ?><p class="muted">No orders yet.</p><?php else: ?>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>Order</th><th>Placed</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>InstaPay confirmation</th></tr></thead>
      <tbody>
      <?php foreach (array_slice($orders, 0, 8) as $o): ?>
        <tr>
          <td><?= adm_order_link($o['id']) ?></td>
          <td class="nowrap"><?= h(date('j M, H:i', strtotime($o['created']))) ?></td>
          <td><?= h($o['customer']['name']) ?></td>
          <td class="muted small"><?= h(adm_items_text($o)) ?></td>
          <td class="nowrap"><?= adm_money((int)$o['total']) ?></td>
          <td><span class="st st-<?= h($o['status']) ?>"><?= h(STATUSES[$o['status']] ?? $o['status']) ?></span></td>
          <td><?= adm_pay_pill($o) ?></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </div>

<?php
/* ---------- InstaPay transfers ---------- */
elseif ($tab === 'instapay'):
    $site = rt_site();
    $f = $_GET['pay'] ?? 'open';
    if ($f !== 'open' && $f !== 'all' && !isset(RT_PAY_STATUSES[$f])) $f = 'open';
    $live = array_values(array_filter($orders, fn($o) => $o['status'] !== 'cancelled' || rt_pay($o)['status'] === 'confirmed'));
    $counts = ['open' => count(array_filter($live, 'adm_pay_open')), 'all' => count($live)];
    foreach ($live as $o) { $s = rt_pay($o)['status']; $counts[$s] = ($counts[$s] ?? 0) + 1; }
    $list = array_values(array_filter($live, fn($o) => $f === 'all' || ($f === 'open' ? adm_pay_open($o) : rt_pay($o)['status'] === $f)));
    $waiting = array_sum(array_map(fn($o) => (int)rt_pay($o)['amount'], array_filter($live, 'adm_pay_open')));
?>
  <div class="head"><h1 class="h1">InstaPay transfers</h1><span class="muted"><?= adm_money($waiting) ?> waiting to be confirmed</span></div>
  <div class="panel">
    <p class="muted" style="margin-top:0">Customers send money to <b class="ltr"><?= h($site['instapay_handle'] ?? '') ?></b> / <b class="ltr"><?= h($site['instapay_number'] ?? '') ?></b>, then send the screenshot on WhatsApp. Check the money arrived in your InstaPay app, write the reference if you like, then press Confirm. Confirming marks the order paid.</p>
    <div class="filters">
      <a class="chip <?= $f === 'open' ? 'on' : '' ?>" href="?tab=instapay">To confirm <?= $counts['open'] ?></a>
      <?php foreach (RT_PAY_STATUSES as $k => $v): ?><a class="chip <?= $f === $k ? 'on' : '' ?>" href="?tab=instapay&amp;pay=<?= $k ?>"><?= h($v) ?> <?= (int)($counts[$k] ?? 0) ?></a><?php endforeach; ?>
      <a class="chip <?= $f === 'all' ? 'on' : '' ?>" href="?tab=instapay&amp;pay=all">All <?= $counts['all'] ?></a>
    </div>
    <?php if (!$list): ?><p class="muted">No transfers here.</p><?php else: ?>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Reference / note</th><th>Action</th></tr></thead>
      <tbody>
      <?php foreach ($list as $o): $p = rt_pay($o); $c = $o['customer']; ?>
        <tr id="<?= h($o['id']) ?>">
          <td><?= adm_order_link($o['id']) ?><br><span class="muted small"><?= h(date('j M Y, H:i', strtotime($o['created']))) ?></span></td>
          <td><?= h($c['name']) ?><br><a class="ltr small" href="https://wa.me/<?= h(rt_eg_phone($c['phone'])) ?>" target="_blank"><?= h($c['phone']) ?></a></td>
          <td class="nowrap"><b><?= adm_money((int)$p['amount']) ?></b></td>
          <td><?= adm_pay_pill($o) ?>
            <?php if (!empty($p['confirmed_at'])): ?><br><span class="muted small">confirmed <?= h(date('j M, H:i', strtotime($p['confirmed_at']))) ?></span><?php endif; ?></td>
          <td class="small"><?= h($p['ref'] ?? '') ?: '<span class="muted">—</span>' ?><?php if (!empty($p['note'])): ?><br><span class="muted"><?= h($p['note']) ?></span><?php endif; ?>
            <?php if (!empty($p['by_customer'])): ?><br><span class="muted">marked sent by the customer</span><?php endif; ?>
            <?php if (!empty($p['proof'])): ?><br><a href="?proof=<?= h($p['proof']) ?>" target="_blank"><img src="?proof=<?= h($p['proof']) ?>" alt="Payment screenshot" class="proof-thumb" style="max-width:110px;margin-top:6px"></a><?php endif; ?></td>
          <td>
            <?php if (in_array($p['status'], ['awaiting', 'sent'], true)): ?>
              <form method="post" class="payform"><?= adm_form('pay_confirm', ['id' => $o['id'], 'back' => 'instapay']) ?>
                <input class="input" name="ref" value="<?= h($p['ref'] ?? '') ?>" placeholder="Reference (optional)" aria-label="Transfer reference">
                <button class="btn btn-sm">Confirm</button>
                <?php if ($p['status'] === 'awaiting'): ?><button class="btn btn-ghost btn-sm" name="action" value="pay_sent">Customer sent it</button><?php endif; ?>
                <button class="btn btn-ghost btn-sm danger" name="action" value="pay_reject" onclick="return confirm('Reject this transfer? The order stays unpaid.')">Reject</button>
              </form>
            <?php elseif ($p['status'] === 'rejected'): ?>
              <form method="post"><?= adm_form('pay_reset', ['id' => $o['id'], 'back' => 'instapay']) ?><button class="btn btn-ghost btn-sm">Wait for a new transfer</button></form>
            <?php else: ?><span class="muted small">Done</span><?php endif; ?>
          </td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </div>

<?php
/* ---------- Shipping ---------- */
elseif ($tab === 'shipping'):
    $ready = array_values(array_filter($orders, fn($o) => in_array($o['status'], ['paid', 'printing'], true)));
    $onWay = array_values(array_filter($orders, fn($o) => $o['status'] === 'shipped'));
    $done = array_slice(array_values(array_filter($orders, fn($o) => $o['status'] === 'delivered')), 0, 20);
    $site = rt_site();
?>
  <div class="head"><h1 class="h1">Shipping</h1><span class="muted">Delivery fee: Cairo &amp; Giza <?= (int)($site['delivery_fee'] ?? 0) ?> EGP · other governorates <?= (int)($site['delivery_fee_other'] ?? 0) ?> EGP</span></div>
  <div class="panel">
    <h2>Ready to ship <span class="muted">(<?= count($ready) ?>)</span></h2>
    <?php if (!$ready): ?><p class="muted">No paid orders waiting. Orders show here once their InstaPay transfer is confirmed.</p><?php endif; ?>
    <?php foreach ($ready as $o): $c = $o['customer']; ?>
      <div class="shiprow" id="<?= h($o['id']) ?>">
        <div>
          <b><?= adm_order_link($o['id']) ?></b> <span class="st st-<?= h($o['status']) ?>"><?= h(STATUSES[$o['status']]) ?></span><br>
          <?= h($c['name']) ?> · <a class="ltr" href="https://wa.me/<?= h(rt_eg_phone($c['phone'])) ?>" target="_blank"><?= h($c['phone']) ?></a><br>
          <span class="muted"><?= h(ucfirst($c['area'])) ?>, <?= h($c['address']) ?></span><br>
          <span class="muted small"><?= h(adm_items_text($o)) ?></span>
        </div>
        <form method="post" class="shipform"><?= adm_form('ship', ['id' => $o['id']]) ?>
          <select class="input" name="courier" required aria-label="Courier"><option value="">Courier…</option><?php foreach (ADM_COURIERS as $cr): ?><option><?= h($cr) ?></option><?php endforeach; ?></select>
          <input class="input ltr" name="tracking" placeholder="Tracking number" aria-label="Tracking number">
          <button class="btn btn-sm">Mark shipped</button>
          <a class="btn btn-ghost btn-sm" href="?slip=<?= h($o['id']) ?>" target="_blank">Packing slip</a>
        </form>
      </div>
    <?php endforeach; ?>
  </div>

  <div class="panel">
    <h2>On the way <span class="muted">(<?= count($onWay) ?>)</span></h2>
    <?php if (!$onWay): ?><p class="muted">Nothing on the way.</p><?php else: ?>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>Order</th><th>Customer</th><th>Area</th><th>Courier</th><th>Tracking</th><th>Shipped</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($onWay as $o): $s = $o['shipping'] ?? []; ?>
        <tr id="<?= h($o['id']) ?>">
          <td><?= adm_order_link($o['id']) ?></td>
          <td><?= h($o['customer']['name']) ?><br><span class="muted small ltr"><?= h($o['customer']['phone']) ?></span></td>
          <td><?= h(ucfirst($o['customer']['area'])) ?></td>
          <td><?= h($s['courier'] ?? '—') ?></td>
          <td class="ltr"><?= h(($s['tracking'] ?? '') ?: '—') ?></td>
          <td class="nowrap"><?= !empty($s['shipped_at']) ? h(date('j M', strtotime($s['shipped_at']))) : '—' ?></td>
          <td><form method="post"><?= adm_form('deliver', ['id' => $o['id']]) ?><button class="btn btn-sm">Delivered</button></form> <a class="small" href="?slip=<?= h($o['id']) ?>" target="_blank">Slip</a></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </div>

  <?php if ($done): ?>
  <div class="panel">
    <h2>Recently delivered</h2>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>Order</th><th>Customer</th><th>Courier</th><th>Delivered</th></tr></thead>
      <tbody>
      <?php foreach ($done as $o): $s = $o['shipping'] ?? []; ?>
        <tr><td><?= adm_order_link($o['id']) ?></td><td><?= h($o['customer']['name']) ?></td><td><?= h($s['courier'] ?? '—') ?></td><td><?= !empty($s['delivered_at']) ? h(date('j M Y', strtotime($s['delivered_at']))) : '—' ?></td></tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
  </div>
  <?php endif; ?>

<?php
/* ---------- Inventory ---------- */
elseif ($tab === 'inventory'):
    $stock = rt_stock();
    $reserved = rt_stock_reserved($orders);
?>
  <div class="head"><h1 class="h1">Inventory</h1></div>
  <div class="panel">
    <p class="muted" style="margin-top:0">Blank materials in your workshop. Marking an order shipped takes its pieces (and one NFC chip each) out of stock automatically. “Needed” counts paid orders not shipped yet.</p>
    <form method="post"><?= adm_form('save_stock') ?>
      <div class="scroll"><table class="tbl stock">
        <thead><tr><th>Item</th><th>In stock</th><th>Low-stock line</th><th>Needed</th><th>Left after</th><th></th></tr></thead>
        <tbody>
        <?php foreach (rt_stock_items() as $k => $label): $s = $stock[$k]; $left = $s['qty'] - $reserved[$k]; $mine = !isset(RT_STOCK_ITEMS[$k]); ?>
          <tr>
            <td><b><?= h($label) ?></b><?php if ($mine): ?><br><span class="muted small">counted by hand</span> <button class="linkbtn small danger" form="rm-<?= h($k) ?>" onclick="return confirm('Remove <?= h($label) ?> from the list?')">Remove</button><?php endif; ?></td>
            <td><input class="input num" name="qty[<?= h($k) ?>]" inputmode="numeric" value="<?= (int)$s['qty'] ?>" aria-label="<?= h($label) ?> in stock"></td>
            <td><input class="input num" name="min[<?= h($k) ?>]" inputmode="numeric" value="<?= (int)$s['min'] ?>" aria-label="<?= h($label) ?> low-stock line"></td>
            <td><?= (int)$reserved[$k] ?></td>
            <td><b><?= $left ?></b></td>
            <td><?php if ($left < 0): ?><span class="pill bad">Short <?= -$left ?></span><?php elseif ($s['qty'] <= $s['min']): ?><span class="pill warn">Low</span><?php else: ?><span class="pill ok">OK</span><?php endif; ?></td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table></div>
      <button class="btn" style="margin-top:16px">Save stock</button>
    </form>
    <?php foreach (array_diff_key(rt_stock_items(), RT_STOCK_ITEMS) as $k => $label): ?><form method="post" id="rm-<?= h($k) ?>" hidden><?= adm_form('stock_remove', ['key' => $k]) ?></form><?php endforeach; ?>
    <form method="post" class="shipform" style="margin-top:20px;padding-top:16px;border-top:1px solid var(--line)"><?= adm_form('stock_add') ?>
      <label for="st-new" class="muted small">Something else you keep in stock (boxes, stickers, ribbon…)</label>
      <input class="input" id="st-new" name="label" maxlength="60" placeholder="Gift boxes" style="max-width:240px">
      <button class="btn btn-ghost btn-sm">Add item</button>
    </form>
  </div>

<?php
/* ---------- Discount codes ---------- */
elseif ($tab === 'coupons'):
    $all = rt_coupons();
    $editCode = rt_coupon_code((string)($_GET['edit'] ?? ''));
    $e = $all[$editCode] ?? null;
    if (!$e) $editCode = '';
    $e = $e ?? ['type' => 'percent', 'value' => 10, 'min' => 0, 'expires' => '', 'max_uses' => 0, 'active' => true, 'note' => ''];
    $given = [];
    foreach ($orders as $o) if (!empty($o['coupon']) && adm_is_paid($o)) $given[$o['coupon']] = ($given[$o['coupon']] ?? 0) + (int)($o['discount'] ?? 0);
?>
  <div class="head"><h1 class="h1">Discount codes</h1></div>
  <div class="grid2">
    <div class="panel">
      <h2>Codes</h2>
      <?php if (!$all): ?><p class="muted">No codes yet. Add one, then share it on Instagram or with a customer. It works at checkout.</p><?php else: ?>
      <div class="scroll"><table class="tbl">
        <thead><tr><th>Code</th><th>Discount</th><th>Min order</th><th>Expires</th><th>Used</th><th>Given (paid)</th><th>Status</th><th></th></tr></thead>
        <tbody>
        <?php foreach ($all as $code => $c):
          $expired = !empty($c['expires']) && $c['expires'] < date('Y-m-d');
          $usedUp = !empty($c['max_uses']) && (int)$c['used'] >= (int)$c['max_uses']; ?>
          <tr>
            <td><b class="ltr"><?= h($code) ?></b><?php if (!empty($c['note'])): ?><br><span class="muted small"><?= h($c['note']) ?></span><?php endif; ?></td>
            <td class="nowrap"><?= $c['type'] === 'percent' ? (int)$c['value'] . '%' : number_format((int)$c['value']) . ' EGP' ?></td>
            <td class="nowrap"><?= (int)$c['min'] ? number_format((int)$c['min']) . ' EGP' : '—' ?></td>
            <td class="nowrap"><?= h($c['expires'] ?: 'Never') ?></td>
            <td><?= (int)$c['used'] ?><?= (int)$c['max_uses'] ? ' / ' . (int)$c['max_uses'] : '' ?></td>
            <td class="nowrap"><?= number_format($given[$code] ?? 0) ?> EGP</td>
            <td><?php if (empty($c['active'])): ?><span class="pill off">Off</span><?php elseif ($expired): ?><span class="pill warn">Expired</span><?php elseif ($usedUp): ?><span class="pill warn">Used up</span><?php else: ?><span class="pill ok">Active</span><?php endif; ?></td>
            <td class="actions">
              <a class="btn btn-ghost btn-sm" href="?tab=coupons&amp;edit=<?= h(urlencode($code)) ?>">Edit</a>
              <form method="post"><?= adm_form('coupon_toggle', ['code' => $code]) ?><button class="btn btn-ghost btn-sm"><?= empty($c['active']) ? 'Turn on' : 'Turn off' ?></button></form>
              <form method="post"><?= adm_form('coupon_delete', ['code' => $code]) ?><button class="btn btn-ghost btn-sm danger" onclick="return confirm('Delete code <?= h($code) ?>?')">Delete</button></form>
            </td>
          </tr>
        <?php endforeach; ?>
        </tbody>
      </table></div>
      <?php endif; ?>
    </div>

    <form class="panel settings" method="post"><?= adm_form('coupon_save', ['orig' => $editCode]) ?>
      <h2 style="margin:0"><?= $editCode ? 'Edit ' . h($editCode) : 'New code' ?></h2>
      <label for="c-code">Code</label>
      <input class="input ltr" id="c-code" name="code" value="<?= h($editCode) ?>" required maxlength="30" placeholder="WELCOME10" style="text-transform:uppercase">
      <div class="two">
        <div><label for="c-type">Type</label><select class="input" id="c-type" name="type"><option value="percent" <?= $e['type'] === 'percent' ? 'selected' : '' ?>>Percent off</option><option value="fixed" <?= $e['type'] === 'fixed' ? 'selected' : '' ?>>EGP off</option></select></div>
        <div><label for="c-val">Value</label><input class="input" id="c-val" name="value" inputmode="numeric" value="<?= (int)$e['value'] ?>" required></div>
      </div>
      <div class="two">
        <div><label for="c-min">Minimum order (EGP)</label><input class="input" id="c-min" name="min" inputmode="numeric" value="<?= (int)$e['min'] ?>"></div>
        <div><label for="c-max">Max uses (0 = no limit)</label><input class="input" id="c-max" name="max_uses" inputmode="numeric" value="<?= (int)$e['max_uses'] ?>"></div>
      </div>
      <label for="c-exp">Expires on (empty = never)</label>
      <input class="input" id="c-exp" type="date" name="expires" value="<?= h($e['expires']) ?>">
      <label for="c-note">Note for you (optional)</label>
      <input class="input" id="c-note" name="note" value="<?= h($e['note'] ?? '') ?>" maxlength="120" placeholder="Instagram giveaway, October">
      <label class="check"><input type="checkbox" name="active" value="1" <?= !empty($e['active']) ? 'checked' : '' ?>> Active</label>
      <p class="muted small" style="margin:0">The discount is taken off the products, not the delivery fee.</p>
      <div style="display:flex;gap:10px"><button class="btn">Save code</button><?php if ($editCode): ?><a class="btn btn-ghost" href="?tab=coupons">Cancel</a><?php endif; ?></div>
    </form>
  </div>

<?php
/* ---------- Customers ---------- */
elseif ($tab === 'customers'):
    $q = mb_strtolower(trim((string)($_GET['q'] ?? '')));
    $people = [];
    foreach ($orders as $o) { // newest first, so the first order seen gives the latest name and address
        $c = $o['customer'];
        $key = rt_eg_phone($c['phone']);
        $p = $people[$key] ?? ['name' => $c['name'], 'phone' => $c['phone'], 'email' => $c['email'] ?? '', 'area' => $c['area'], 'orders' => 0, 'paid' => 0, 'spent' => 0, 'last' => $o['created'], 'first' => $o['created'], 'source' => $o['source'] ?? 'direct'];
        if ($p['email'] === '' && !empty($c['email'])) $p['email'] = $c['email'];
        if ($o['status'] !== 'cancelled') $p['orders']++;
        if (adm_is_paid($o)) { $p['paid']++; $p['spent'] += (int)$o['total']; }
        $p['first'] = $o['created'];
        $p['source'] = $o['source'] ?? $p['source'];
        $people[$key] = $p;
    }
    $all = count($people);
    if ($q !== '') $people = array_filter($people, fn($p) => str_contains(mb_strtolower($p['name'] . ' ' . $p['phone'] . ' ' . $p['email']), $q));
    $repeat = count(array_filter($people, fn($p) => $p['paid'] > 1));
?>
  <div class="head"><h1 class="h1">Customers</h1><span class="muted"><?= $all ?> people · <?= $repeat ?> ordered more than once</span></div>
  <div class="panel">
    <div class="filters"><form method="get" class="search" style="margin-left:0"><input type="hidden" name="tab" value="customers"><input class="input" type="search" name="q" value="<?= h($q) ?>" placeholder="Search name, phone or email" aria-label="Search customers"></form></div>
    <?php if (!$people): ?><p class="muted"><?= $all ? 'No customer matches.' : 'Customers appear here after their first order.' ?></p><?php else: ?>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>Name</th><th>Phone</th><th>Area</th><th>Orders</th><th>Paid</th><th>Spent</th><th>First came from</th><th>Last order</th><th></th></tr></thead>
      <tbody>
      <?php foreach ($people as $p): ?>
        <tr>
          <td><b><?= h($p['name']) ?></b><?= $p['email'] ? '<br><span class="muted small">' . h($p['email']) . '</span>' : '' ?></td>
          <td><a class="ltr" href="https://wa.me/<?= h(rt_eg_phone($p['phone'])) ?>" target="_blank"><?= h($p['phone']) ?></a></td>
          <td><?= h(ucfirst($p['area'])) ?></td>
          <td><?= $p['orders'] ?></td>
          <td><?= $p['paid'] ?></td>
          <td class="nowrap"><?= adm_money($p['spent']) ?></td>
          <td><?= h($p['source']) ?></td>
          <td class="nowrap"><?= h(date('j M Y', strtotime($p['last']))) ?></td>
          <td><a class="btn btn-ghost btn-sm" href="?tab=orders&amp;q=<?= h(urlencode($p['phone'])) ?>">Orders</a></td>
        </tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
    <?php endif; ?>
  </div>

<?php
/* ---------- Reviews ---------- */
elseif ($tab === 'reviews'):
    $all = array_reverse(rt_reviews());
    $shown = array_filter($all, fn($r) => !empty($r['shown']));
    $avg = $all ? array_sum(array_column($all, 'rating')) / count($all) : 0;
?>
  <div class="head"><h1 class="h1">Reviews</h1><span class="muted"><?= count($all) ?> reviews<?= $all ? ' · average ' . number_format($avg, 1) . ' / 5' : '' ?> · <?= count($shown) ?> approved</span></div>
  <div class="grid2">
    <div class="panel">
      <h2>Customer reviews</h2>
      <?php if (!$all): ?><p class="muted">No reviews yet. When a customer sends you feedback on WhatsApp or Instagram, add it here with their permission.</p><?php endif; ?>
      <?php foreach ($all as $r): ?>
        <div class="review">
          <div class="head" style="margin:0"><div><b><?= h($r['name']) ?></b><?= $r['role'] ? ' <span class="muted">· ' . h($r['role']) . '</span>' : '' ?></div><span class="stars" aria-label="<?= (int)$r['rating'] ?> of 5"><?= str_repeat('★', (int)$r['rating']) . '<span class="muted">' . str_repeat('★', 5 - (int)$r['rating']) . '</span>' ?></span></div>
          <p><?= nl2br(h($r['text'])) ?></p>
          <div class="actions">
            <?php if (!empty($r['shown'])): ?><span class="pill ok">Approved</span><?php else: ?><span class="pill warn">Not approved</span><?php endif; ?>
            <span class="muted small"><?= h($r['created']) ?><?= $r['product'] ? ' · ' . h(RT_CATALOG[$r['product']]['name'] ?? $r['product']) : '' ?><?= $r['source'] ? ' · via ' . h($r['source']) : '' ?><?= $r['order_id'] ? ' · ' . h($r['order_id']) : '' ?></span>
            <form method="post"><?= adm_form('review_toggle', ['id' => $r['id']]) ?><button class="btn btn-ghost btn-sm"><?= empty($r['shown']) ? 'Approve' : 'Unapprove' ?></button></form>
            <form method="post"><?= adm_form('review_delete', ['id' => $r['id']]) ?><button class="btn btn-ghost btn-sm danger" onclick="return confirm('Delete this review?')">Delete</button></form>
          </div>
        </div>
      <?php endforeach; ?>
    </div>
    <form class="panel settings" method="post"><?= adm_form('review_save') ?>
      <h2 style="margin:0">Add a review</h2>
      <label for="r-name">Customer name</label><input class="input" id="r-name" name="name" required maxlength="60">
      <label for="r-role">Business or job (optional)</label><input class="input" id="r-role" name="role" maxlength="80" placeholder="Owner, Bean There café">
      <div class="two">
        <div><label for="r-rate">Rating</label><select class="input" id="r-rate" name="rating"><?php for ($i = 5; $i >= 1; $i--): ?><option value="<?= $i ?>"><?= $i ?> ★</option><?php endfor; ?></select></div>
        <div><label for="r-prod">Product</label><select class="input" id="r-prod" name="product"><option value="">—</option><?php foreach (RT_CATALOG as $k => $d): ?><option value="<?= h($k) ?>"><?= h($d['name']) ?></option><?php endforeach; ?></select></div>
      </div>
      <label for="r-text">What they said</label><textarea class="input" id="r-text" name="text" rows="4" required maxlength="600"></textarea>
      <div class="two">
        <div><label for="r-src">Where (optional)</label><input class="input" id="r-src" name="source" maxlength="40" placeholder="WhatsApp"></div>
        <div><label for="r-ord">Order no. (optional)</label><input class="input ltr" id="r-ord" name="order_id" maxlength="14" placeholder="RT-261017-AB12"></div>
      </div>
      <label class="check"><input type="checkbox" name="shown" value="1" checked> Approved (the customer agreed it can be shared)</label>
      <button class="btn">Save review</button>
    </form>
  </div>

<?php
/* ---------- Reports ---------- */
elseif ($tab === 'reports'):
    $months = [];
    for ($i = 11; $i >= 0; $i--) $months[date('Y-m', strtotime(date('Y-m-01') . " -$i month"))] = ['orders' => 0, 'paid' => 0, 'revenue' => 0, 'discount' => 0];
    $prod = [];
    $areas = [];
    $sources = [];
    $paidAll = 0;
    $revAll = 0;
    $placed = 0;
    foreach ($orders as $o) {
        $m = substr($o['created'], 0, 7);
        $paid = adm_is_paid($o);
        if ($o['status'] !== 'cancelled') $placed++;
        if (isset($months[$m])) {
            if ($o['status'] !== 'cancelled') $months[$m]['orders']++;
            if ($paid) { $months[$m]['paid']++; $months[$m]['revenue'] += (int)$o['total']; $months[$m]['discount'] += (int)($o['discount'] ?? 0); }
        }
        if (!$paid) continue;
        $paidAll++;
        $revAll += (int)$o['total'];
        foreach (adm_lines($o) as $i) {
            $k = (RT_CATALOG[$i['product']]['name'] ?? ucfirst($i['product'])) . ' · ' . rt_plan_label($i['product'], $i['plan']);
            $prod[$k]['qty'] = ($prod[$k]['qty'] ?? 0) + (int)$i['qty'];
            $prod[$k]['revenue'] = ($prod[$k]['revenue'] ?? 0) + (int)$i['unit_price'] * (int)$i['qty'];
        }
        $a = ucfirst($o['customer']['area']);
        $areas[$a]['orders'] = ($areas[$a]['orders'] ?? 0) + 1;
        $areas[$a]['revenue'] = ($areas[$a]['revenue'] ?? 0) + (int)$o['total'];
        $s = $o['source'] ?? 'direct';
        $sources[$s]['orders'] = ($sources[$s]['orders'] ?? 0) + 1;
        $sources[$s]['revenue'] = ($sources[$s]['revenue'] ?? 0) + (int)$o['total'];
    }
    uasort($prod, fn($a, $b) => $b['revenue'] <=> $a['revenue']);
    uasort($areas, fn($a, $b) => $b['revenue'] <=> $a['revenue']);
    uasort($sources, fn($a, $b) => $b['orders'] <=> $a['orders']);
    $maxRev = max(1, ...array_column($months, 'revenue'));
    $bars = function (array $rows, string $col): void {
        $max = max(1, ...array_column($rows, $col)); ?>
        <div class="scroll"><table class="tbl">
          <thead><tr><th></th><th>Orders</th><th>Revenue</th><th class="barcol"></th></tr></thead>
          <tbody>
          <?php foreach ($rows as $k => $r): ?>
            <tr><td><?= h((string)$k) ?></td><td><?= (int)($r['orders'] ?? $r['qty']) ?></td><td class="nowrap"><?= adm_money((int)$r['revenue']) ?></td><td class="barcol"><span class="bar" style="width:<?= round($r[$col] / $max * 100) ?>%"></span></td></tr>
          <?php endforeach; ?>
          </tbody>
        </table></div>
    <?php };
?>
  <div class="head"><h1 class="h1">Reports</h1><span class="muted">Paid orders only, cancelled orders left out · <a href="?export=orders">Download all orders (CSV)</a></span></div>
  <div class="kpis">
    <div><span>Paid revenue (all time)</span><b><?= adm_money($revAll) ?></b></div>
    <div><span>Paid orders</span><b><?= $paidAll ?></b><em>of <?= $placed ?> placed</em></div>
    <div><span>Average order</span><b><?= adm_money($paidAll ? (int)round($revAll / $paidAll) : 0) ?></b></div>
    <div><span>Placed orders paid</span><b><?= $placed ? round($paidAll / $placed * 100) : 0 ?>%</b><em>transfer confirmed</em></div>
  </div>
  <div class="panel">
    <h2>Last 12 months</h2>
    <div class="scroll"><table class="tbl">
      <thead><tr><th>Month</th><th>Placed</th><th>Paid</th><th>Revenue</th><th>Discounts</th><th class="barcol"></th></tr></thead>
      <tbody>
      <?php foreach (array_reverse($months, true) as $m => $r): ?>
        <tr><td class="nowrap"><?= h(date('M Y', strtotime("$m-01"))) ?></td><td><?= $r['orders'] ?></td><td><?= $r['paid'] ?></td><td class="nowrap"><?= adm_money($r['revenue']) ?></td><td class="nowrap"><?= $r['discount'] ? number_format($r['discount']) . ' EGP' : '—' ?></td><td class="barcol"><span class="bar" style="width:<?= round($r['revenue'] / $maxRev * 100) ?>%"></span></td></tr>
      <?php endforeach; ?>
      </tbody>
    </table></div>
  </div>
  <div class="grid2">
    <div class="panel"><h2>Top products</h2><?php if ($prod): ?><div class="scroll"><table class="tbl">
      <thead><tr><th></th><th>Pieces</th><th>Revenue</th><th class="barcol"></th></tr></thead>
      <tbody><?php $pm = max(1, ...array_column($prod, 'revenue')); foreach ($prod as $k => $r): ?><tr><td><?= h($k) ?></td><td><?= (int)$r['qty'] ?></td><td class="nowrap"><?= adm_money((int)$r['revenue']) ?></td><td class="barcol"><span class="bar" style="width:<?= round($r['revenue'] / $pm * 100) ?>%"></span></td></tr><?php endforeach; ?></tbody>
    </table></div><p class="muted small">Product revenue is before delivery and discounts.</p><?php else: ?><p class="muted">No paid orders yet.</p><?php endif; ?></div>
    <div class="panel"><h2>Delivery areas</h2><?php if ($areas) $bars($areas, 'revenue'); else echo '<p class="muted">No paid orders yet.</p>'; ?>
      <h2 style="margin-top:22px">Where orders come from</h2><?php if ($sources) $bars($sources, 'orders'); else echo '<p class="muted">No paid orders yet.</p>'; ?></div>
  </div>

<?php
/* ---------- Distributor requests ---------- */
elseif ($tab === 'distributors'):
    $all = rt_list('distributors');
    usort($all, fn($a, $b) => strcmp($b['created'], $a['created']));
    $f = isset(RT_DIST_STATUSES[$_GET['st'] ?? '']) ? $_GET['st'] : '';
    $counts = [];
    foreach ($all as $d) $counts[$d['status']] = ($counts[$d['status']] ?? 0) + 1;
    $list = $f ? array_filter($all, fn($d) => $d['status'] === $f) : $all;
?>
  <div class="head"><h1 class="h1">Distributor requests</h1></div>
  <div class="panel">
    <p class="muted" style="margin-top:0">Shops and resellers who want to sell RemoTap. Requests arrive through <code>api/distributor.php</code> (name, company, phone, email, city, kind, volume, message).</p>
    <div class="filters">
      <a class="chip <?= $f === '' ? 'on' : '' ?>" href="?tab=distributors">All <?= count($all) ?></a>
      <?php foreach (RT_DIST_STATUSES as $k => $v): ?><a class="chip <?= $f === $k ? 'on' : '' ?>" href="?tab=distributors&amp;st=<?= $k ?>"><?= h($v) ?> <?= (int)($counts[$k] ?? 0) ?></a><?php endforeach; ?>
    </div>
    <?php if (!$list): ?><p class="muted"><?= $all ? 'No requests with this status.' : 'No requests yet.' ?></p><?php endif; ?>
    <?php foreach ($list as $d): ?>
      <div class="shiprow" id="<?= h($d['id']) ?>">
        <div>
          <b><?= h($d['name']) ?></b><?= $d['company'] ? ' · ' . h($d['company']) : '' ?> <span class="pill d-<?= h($d['status']) ?>"><?= h(RT_DIST_STATUSES[$d['status']] ?? $d['status']) ?></span><br>
          <a class="ltr" href="https://wa.me/<?= h(rt_eg_phone($d['phone'])) ?>" target="_blank"><?= h($d['phone']) ?></a><?= $d['email'] ? ' · ' . h($d['email']) : '' ?><?= $d['city'] ? ' · ' . h($d['city']) : '' ?><br>
          <span class="muted small"><?= h(date('j M Y, H:i', strtotime($d['created']))) ?><?= $d['kind'] ? ' · ' . h($d['kind']) : '' ?><?= $d['volume'] ? ' · ' . h($d['volume']) : '' ?></span>
          <?php if ($d['message']): ?><p style="margin:8px 0 0"><?= nl2br(h($d['message'])) ?></p><?php endif; ?>
        </div>
        <form method="post" class="shipform"><?= adm_form('dist_save', ['id' => $d['id']]) ?>
          <select class="input" name="status" aria-label="Request status"><?php foreach (RT_DIST_STATUSES as $k => $v): ?><option value="<?= $k ?>" <?= $d['status'] === $k ? 'selected' : '' ?>><?= h($v) ?></option><?php endforeach; ?></select>
          <input class="input" name="note" value="<?= h($d['note'] ?? '') ?>" placeholder="Your note" aria-label="Your note">
          <button class="btn btn-sm">Save</button>
        </form>
      </div>
    <?php endforeach; ?>
  </div>
<?php endif;
