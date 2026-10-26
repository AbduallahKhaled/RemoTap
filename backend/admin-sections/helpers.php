<?php
// Shared helpers for the admin sections. Included by admin.php after login only.
declare(strict_types=1);
if (!defined('RT_ADMIN')) { http_response_code(403); exit; }

/** Sidebar: tab => label. Order here = order in the menu. */
const ADM_MENU = [
    'dashboard' => 'Dashboard',
    'orders' => 'Orders',
    'instapay' => 'InstaPay transfers',
    'shipping' => 'Shipping',
    'inventory' => 'Inventory',
    'coupons' => 'Discount codes',
    'customers' => 'Customers',
    'reviews' => 'Reviews',
    'reports' => 'Reports',
    'distributors' => 'Distributor requests',
];
const ADM_MENU_STORE = [
    'products' => 'Products & prices',
    'pages' => 'Customer pages',
    'services' => 'Extra services',
    'settings' => 'Settings',
];
/** Tabs whose view lives in admin-sections/views.php */
const ADM_SECTIONS = ['services', 'dashboard', 'instapay', 'shipping', 'inventory', 'coupons', 'customers', 'reviews', 'reports', 'distributors'];

const ADM_COURIERS = ['Bosta', 'Aramex', 'J&T Express', 'Mylerz', 'Egypt Post', 'Own delivery'];

function adm_order(string $id): ?array {
    return preg_match('/^RT-[0-9]{6}-[A-Z0-9]{4}$/', $id) ? rt_read_json(rt_order_path($id)) : null;
}

/** Paid orders: everything except awaiting payment and cancelled. */
function adm_is_paid(array $o): bool {
    return !in_array($o['status'] ?? '', ['awaiting_payment', 'cancelled'], true);
}

/** The InstaPay transfer still needs the owner: waiting for money, or the customer says they sent it. */
function adm_pay_open(array $o): bool {
    return ($o['status'] ?? '') !== 'cancelled' && in_array(rt_pay($o)['status'], ['awaiting', 'sent'], true);
}

function adm_pay_pill(array $o): string {
    $p = rt_pay($o);
    if (($o['status'] ?? '') === 'cancelled' && $p['status'] !== 'confirmed') return '<span class="pay pay-off">InstaPay: order cancelled</span>';
    return '<span class="pay pay-' . h($p['status']) . '">InstaPay: ' . h(RT_PAY_STATUSES[$p['status']] ?? $p['status']) . '</span>';
}

/** One line per order: "Card Plus × 2 + Stand 15x20 cm × 1" */
function adm_items_text(array $o): string {
    return implode(' + ', array_map(fn($i) => ucfirst($i['product']) . ' ' . rt_plan_label($i['product'], $i['plan']) . (!empty($i['extras']) ? ' + ' . implode(', ', $i['extras']) : '') . ' × ' . (int)$i['qty'], adm_lines($o)));
}

/** Order lines, with old single-product orders turned into one line. */
function adm_lines(array $o): array {
    if (!empty($o['items'])) return $o['items'];
    return [['product' => $o['product'], 'plan' => $o['plan'], 'qty' => (int)$o['qty'], 'unit_price' => (int)$o['unit_price'], 'extras' => []]];
}

/**
 * Change an order's status and keep the rest in step: any paid status also confirms the InstaPay transfer,
 * "shipped" or "delivered" takes the pieces out of stock once and stamps the shipping dates.
 */
function adm_set_status(array &$o, string $st): void {
    $o['status'] = $st;
    $o['history'][] = ['status' => $st, 'at' => date('c')];
    if ($st !== 'awaiting_payment' && $st !== 'cancelled') {
        $p = rt_pay($o);
        if ($p['status'] !== 'confirmed') $o['payment'] = array_merge($p, ['status' => 'confirmed', 'confirmed_at' => date('c')]);
    }
    if (in_array($st, ['shipped', 'delivered'], true)) {
        $o['shipping']['shipped_at'] ??= date('c');
        if ($st === 'delivered') $o['shipping']['delivered_at'] ??= date('c');
        if (empty($o['stock_used'])) {
            $stock = rt_stock();
            foreach (adm_lines($o) as $i) {
                $q = (int)$i['qty'];
                $stock[rt_stock_key((string)$i['product'], (string)$i['plan'], (string)($i['design'] ?? ''))]['qty'] -= $q;
                $stock['nfc_chips']['qty'] -= $q;
            }
            rt_write_json(RT_DATA . '/stock.json', $stock);
            $o['stock_used'] = true;
        }
    }
}

/** Link to the order on the Orders tab. */
function adm_order_link(string $id): string {
    return '<a class="ltr" href="?tab=orders&amp;q=' . h(urlencode($id)) . '#' . h($id) . '">' . h($id) . '</a>';
}

function adm_money(int $n): string { return number_format($n) . ' <small>EGP</small>'; }

/** Hidden CSRF + action fields for a POST form. */
function adm_form(string $action, array $extra = []): string {
    $s = '<input type="hidden" name="csrf" value="' . h($_SESSION['csrf'] ?? '') . '"><input type="hidden" name="action" value="' . h($action) . '">';
    foreach ($extra as $k => $v) $s .= '<input type="hidden" name="' . h($k) . '" value="' . h((string)$v) . '">';
    return $s;
}
