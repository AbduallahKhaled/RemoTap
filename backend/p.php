<?php
// RemoTap profile page: what a card or stand opens. URL: /p/{slug}  (?s=n from the chip, ?s=q from the QR)
declare(strict_types=1);
require __DIR__ . '/lib.php';

$slug = strtolower((string)($_GET['u'] ?? ''));
$p = rt_get_profile($slug);

if (!$p || rt_profile_mode($p) === 'off') {
    http_response_code(404);
    header('Location: ' . rt_base_url() . '/?missing=1', true, 302);
    exit;
}

/* ---------- Save contact (vCard) ---------- */
if (isset($_GET['vcf'])) {
    $tel = '';
    $mail = '';
    $urls = [];
    foreach ($p['links'] ?? [] as $l) {
        if (in_array($l['type'], ['phone', 'whatsapp'], true) && $tel === '') $tel = '+' . rt_eg_phone($l['value']);
        if ($l['type'] === 'email') $mail = $l['value'];
        if (in_array($l['type'], ['website', 'linkedin', 'instagram'], true)) $urls[] = rt_link_url($l['type'], $l['value']);
    }
    $esc = fn($s) => str_replace([',', ';', "\n"], ['\,', '\;', '\n'], (string)$s);
    $v = ["BEGIN:VCARD", "VERSION:3.0", 'FN:' . $esc($p['name']), 'N:' . $esc($p['name']) . ';;;;'];
    if (!empty($p['title'])) $v[] = 'TITLE:' . $esc($p['title']);
    if ($tel) $v[] = "TEL;TYPE=CELL:$tel";
    if ($mail) $v[] = 'EMAIL:' . $esc($mail);
    $v[] = 'URL:' . rt_base_url() . '/p/' . $slug;
    foreach (array_filter($urls) as $u) $v[] = 'URL:' . $esc($u);
    $v[] = 'NOTE:' . $esc('Saved with RemoTap');
    $v[] = 'END:VCARD';
    header('Content-Type: text/vcard; charset=utf-8');
    header('Content-Disposition: attachment; filename="' . $slug . '.vcf"');
    echo implode("\r\n", $v) . "\r\n";
    exit;
}

$embed = isset($_GET['embed']);
if (!$embed) rt_count_tap($slug, ['n' => 'nfc', 'q' => 'qr'][$_GET['s'] ?? ''] ?? 'web');

/* ---------- Basic plan (or Plus not renewed): open the one main link ---------- */
$mode = rt_profile_mode($p);
if ($mode === 'single') {
    $pr = rt_primary($p);
    $url = rt_safe_url(rt_link_url($pr['type'], $pr['value']));
    if ($url !== '' && !$embed) {
        header('Cache-Control: no-store');
        header('Location: ' . $url, true, 302);
        exit;
    }
    // InstaPay handle with no link: show it on a minimal page with a copy button.
    $p['links'] = [$pr];
}

/* ---------- Language ---------- */
$plang = $p['lang'] ?? 'en';
if ($plang === 'both') {
    $plang = in_array($_GET['l'] ?? '', ['ar', 'en'], true) ? $_GET['l'] : (str_starts_with(strtolower($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''), 'ar') ? 'ar' : 'en');
    $canSwitch = true;
} else {
    $canSwitch = false;
}
$ar = $plang === 'ar';
$L = $ar ? [
    'save' => 'احفظ الرقم', 'instapay' => 'ادفع بإنستاباي', 'whatsapp' => 'واتساب', 'phone' => 'اتصل', 'email' => 'إيميل',
    'instagram' => 'إنستجرام', 'linkedin' => 'لينكدإن', 'facebook' => 'فيسبوك', 'tiktok' => 'تيك توك', 'google' => 'قيّمنا على جوجل',
    'website' => 'الموقع', 'menu' => 'المنيو', 'resume' => 'شوف السيرة الذاتية', 'vfcash' => 'ادفع بفودافون كاش', 'copied' => 'اتنسخ! افتح إنستاباي والصقه', 'copied_vf' => 'اتنسخ الرقم! حوّل عليه من فودافون كاش', 'copy' => 'نسخ', 'powered' => 'Powered by RemoTap', 'get' => 'اعمل كارتك', 'switch' => 'English',
] : [
    'save' => 'Save contact', 'instapay' => 'Pay with InstaPay', 'whatsapp' => 'WhatsApp', 'phone' => 'Call', 'email' => 'Email',
    'instagram' => 'Instagram', 'linkedin' => 'LinkedIn', 'facebook' => 'Facebook', 'tiktok' => 'TikTok', 'google' => 'Review us on Google',
    'website' => 'Website', 'menu' => 'Menu', 'resume' => 'View my resume', 'vfcash' => 'Pay with Vodafone Cash', 'copied' => 'Copied! Open InstaPay and paste it', 'copied_vf' => 'Number copied! Send to it from Vodafone Cash', 'copy' => 'Copy', 'powered' => 'Powered by RemoTap', 'get' => 'Get your own', 'switch' => 'العربية',
];

$ICONS = [
    'save' => '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M19 8v6M22 11h-6"/>',
    'instapay' => '<rect x="2" y="6" width="20" height="13" rx="3"/><path d="M2 10h20M6 15h4"/>',
    'whatsapp' => '<path d="M3 21l1.7-4.6A8.5 8.5 0 1 1 8 19.6z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1.2-1.2 2 .8-.4 1.6c-3.7.4-8-3.9-7.6-7.6l1.6-.4.8 2z"/>',
    'phone' => '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    'email' => '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M22 7l-10 6L2 7"/>',
    'instagram' => '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>',
    'linkedin' => '<rect x="2" y="2" width="20" height="20" rx="4"/><path d="M7 10v7M7 7v.01M11 17v-4a2.5 2.5 0 0 1 5 0v4M11 10v7"/>',
    'facebook' => '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    'tiktok' => '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3a5 5 0 0 0 5 5"/>',
    'google' => '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    'website' => '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/>',
    'menu' => '<path d="M4 3h16v18H4zM8 7h8M8 11h8M8 15h5"/>',
    'resume' => '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    'vfcash' => '<rect x="6" y="2" width="12" height="20" rx="3"/><path d="M10 18h4M12 7v6M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3"/>',
];
function icon(string $k, array $I): string {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($I[$k] ?? $I['website']) . '</svg>';
}

$links = $p['links'] ?? [];
// "View my resume" sits right under Save contact, whatever order it was typed in.
usort($links, fn($a, $b) => ($b['type'] === 'resume') <=> ($a['type'] === 'resume'));
$hasContact = (bool)array_filter($links, fn($l) => in_array($l['type'], ['phone', 'whatsapp', 'email'], true));
$initials = mb_strtoupper(implode('', array_map(fn($w) => mb_substr($w, 0, 1), array_slice(preg_split('/\s+/u', trim($p['name'])) ?: [], 0, 2))));
$photo = !empty($p['photo']) && str_starts_with($p['photo'], 'uploads/') ? rt_base_url() . '/' . $p['photo'] : '';
$self = rt_base_url() . '/p/' . $slug;
$home = rt_base_url() . '/';
?><!doctype html>
<html lang="<?= $ar ? 'ar' : 'en' ?>" dir="<?= $ar ? 'rtl' : 'ltr' ?>">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title><?= h($p['name']) ?> | RemoTap</title>
<meta name="description" content="<?= h(($p['title'] ?? '') ?: $p['name']) ?>">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#00000E">
<meta property="og:title" content="<?= h($p['name']) ?>">
<meta property="og:description" content="<?= h($p['title'] ?? '') ?>">
<?php if ($photo): ?><meta property="og:image" content="<?= h($photo) ?>"><?php endif; ?>
<link rel="icon" type="image/png" href="<?= h($home) ?>assets/img/favicon-48.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Sora:wght@400;600;700&display=swap" rel="stylesheet">
<style>
:root{--ink:#00000e;--s:#0b0b26;--s2:#12122f;--line:rgba(140,82,255,.22);--text:#eeecff;--muted:#a3a1c4;--p:#8c52ff;--b:#3776ff;--c:#2fd6f5;--grad:linear-gradient(120deg,#8c52ff,#3776ff);--grad2:linear-gradient(120deg,#3776ff,#2fd6f5)}
*{box-sizing:border-box}html,body{margin:0}
body{min-height:100vh;min-height:100dvh;background:radial-gradient(70% 40% at 50% 0%,rgba(140,82,255,.28),transparent 70%),radial-gradient(60% 40% at 100% 100%,rgba(55,118,255,.18),transparent 70%),var(--ink);color:var(--text);font-family:<?= $ar ? '"Cairo",' : '' ?>"Sora",system-ui,sans-serif;-webkit-font-smoothing:antialiased;display:flex;justify-content:center}
.wrap{width:100%;max-width:440px;padding:40px 18px calc(28px + env(safe-area-inset-bottom));display:flex;flex-direction:column;align-items:center}
.top{width:100%;display:flex;justify-content:space-between;align-items:center;margin-bottom:26px}
.top img{width:30px}.lang{font-size:.8rem;color:var(--muted);padding:6px 12px;border:1px solid var(--line);border-radius:99px;text-decoration:none}
.av{width:124px;height:124px;border-radius:50%;padding:3px;background:var(--grad);box-shadow:0 0 50px -8px rgba(140,82,255,.7);animation:in .6s ease both}
.av>*{width:100%;height:100%;border-radius:50%;object-fit:cover;background:var(--s);display:grid;place-items:center;font-weight:700;font-size:2.4rem;color:#fff}
h1{font-size:1.55rem;margin:18px 0 4px;text-align:center;line-height:1.25;animation:in .6s .08s ease both}
.title{color:var(--muted);text-align:center;font-size:.98rem;animation:in .6s .14s ease both}
.bio{color:var(--muted);text-align:center;font-size:.92rem;margin:12px 0 0;max-width:34ch;line-height:1.6;animation:in .6s .2s ease both}
.btns{width:100%;display:grid;gap:12px;margin-top:28px}
.p-btn{position:relative;overflow:hidden;display:flex;align-items:center;gap:14px;width:100%;min-height:58px;padding:0 18px;border-radius:16px;border:1.5px solid transparent;background:linear-gradient(var(--s),var(--s)) padding-box,var(--grad) border-box;box-shadow:0 0 30px -16px rgba(140,82,255,.8);color:var(--text);text-decoration:none;font:inherit;font-weight:600;font-size:1rem;cursor:pointer;transition:transform .15s,border-color .25s,background .35s;-webkit-tap-highlight-color:transparent;opacity:0;animation:in .5s ease forwards}
.p-btn:hover{transform:translateY(-1px);box-shadow:0 0 34px -10px rgba(140,82,255,.9)}
.p-btn:active{transform:scale(.985)}
.p-btn .i{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:var(--grad);color:#fff;flex:none;transition:background .35s,color .35s}
.p-btn .i svg{width:20px;height:20px}
.p-btn .lbl{flex:1;text-align:start}
.p-btn .arr{opacity:.4;width:18px;height:18px}
html[dir=rtl] .p-btn .arr{transform:scaleX(-1)}
.p-btn.is-tapped{background:var(--grad2) padding-box,var(--grad2) border-box}
.p-btn.is-tapped .i{background:rgba(255,255,255,.22);color:#fff}
.ip{font-size:.8rem;color:var(--muted);display:block;font-weight:400;direction:ltr;text-align:start}
html[dir=rtl] .ip{text-align:end}
.foot{margin-top:auto;padding-top:40px;text-align:center;font-size:.78rem;color:#6f6d93}
.foot a{color:#c9b2ff;text-decoration:none;font-weight:600}
.toast{position:fixed;left:50%;bottom:28px;transform:translate(-50%,20px);opacity:0;background:var(--s2);border:1px solid var(--line);padding:12px 18px;border-radius:12px;font-size:.9rem;transition:.25s;pointer-events:none;z-index:10}
.toast.show{opacity:1;transform:translate(-50%,0)}
.tap-fx{position:fixed;z-index:99;pointer-events:none;width:60px;height:60px;margin:-30px 0 0 -30px;color:var(--c);animation:pop .75s cubic-bezier(.2,.8,.2,1) forwards}
.tap-fx svg{width:100%;height:100%;filter:drop-shadow(0 0 10px rgba(47,214,245,.8))}
.tap-ring{position:fixed;z-index:98;pointer-events:none;width:16px;height:16px;margin:-8px 0 0 -8px;border-radius:50%;border:2px solid var(--p);animation:ring .7s ease-out forwards}
@keyframes pop{0%{transform:scale(.5);opacity:0}20%{opacity:1}100%{transform:translateY(-36px) scale(1.1);opacity:0}}
@keyframes ring{to{transform:scale(7);opacity:0;border-color:var(--b)}}
@keyframes in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;opacity:1!important;transition:none!important}}
</style>
</head>
<body>
<main class="wrap">
  <div class="top">
    <a href="<?= h($home) ?>" aria-label="RemoTap"><img src="<?= h($home) ?>assets/img/mark-64.png" alt="RemoTap"></a>
    <?php if ($canSwitch): ?><a class="lang" href="?l=<?= $ar ? 'en' : 'ar' ?>"><?= h($L['switch']) ?></a><?php endif; ?>
  </div>

  <div class="av"><?php if ($photo): ?><img src="<?= h($photo) ?>" alt="<?= h($p['name']) ?>"><?php else: ?><span><?= h($initials) ?></span><?php endif; ?></div>
  <h1 dir="auto"><?= h($p['name']) ?></h1>
  <?php if (!empty($p['title'])): ?><p class="title" dir="auto"><?= h($p['title']) ?></p><?php endif; ?>
  <?php if (!empty($p['bio'])): ?><p class="bio" dir="auto"><?= h($p['bio']) ?></p><?php endif; ?>

  <div class="btns">
    <?php $n = 0; $d = function () use (&$n) { return 'style="animation-delay:' . (0.25 + 0.06 * $n++) . 's"'; }; ?>
    <?php if ($hasContact && $mode === 'page'): ?>
      <a class="p-btn primary" href="?vcf=1" <?= $d() ?>><span class="i"><?= icon('save', $ICONS) ?></span><span class="lbl"><?= h($L['save']) ?></span></a>
    <?php endif; ?>
    <?php foreach ($links as $l):
        $t = $l['type'];
        $url = rt_safe_url(rt_link_url($t, $l['value']));
        $label = $L[$t] ?? ucfirst($t);
        if (in_array($t, ['instapay', 'vfcash'], true) && $url === ''): ?>
      <button type="button" class="p-btn" data-copy="<?= h($l['value']) ?>" data-msg="<?= h($t === 'vfcash' ? $L['copied_vf'] : $L['copied']) ?>" <?= $d() ?>><span class="i"><?= icon($t, $ICONS) ?></span><span class="lbl"><?= h($label) ?><span class="ip"><?= h($l['value']) ?></span></span><svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg></button>
    <?php elseif ($url !== ''): ?>
      <a class="p-btn<?= $t === 'resume' ? ' cv' : '' ?>" href="<?= h($url) ?>" <?= in_array($t, ['phone', 'email'], true) ? '' : 'target="_blank" rel="noopener"' ?> <?= $d() ?>><span class="i"><?= icon($t, $ICONS) ?></span><span class="lbl"><?= h($label) ?></span><svg class="arr" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></a>
    <?php endif; endforeach; ?>
  </div>

  <p class="foot"><?= h($L['powered']) ?> · <a href="<?= h($home) ?>?ref=<?= h($slug) ?>" target="_top"><?= h($L['get']) ?></a></p>
</main>
<div class="toast" id="toast" role="status"></div>
<script>
(function(){
  var W='<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"><path d="M18 17a10 10 0 0 1 0 14"/><path d="M25 11a18 18 0 0 1 0 26"/><path d="M32 5a26 26 0 0 1 0 38"/><circle cx="11" cy="24" r="3.2" fill="currentColor" stroke="none"/></svg>';
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.addEventListener('click',function(e){
    var b=e.target.closest('.p-btn'); if(!b) return;
    if(!reduce){var x=e.clientX,y=e.clientY;if(!x&&!y){var r=b.getBoundingClientRect();x=r.left+r.width/2;y=r.top+r.height/2;}
      var g=document.createElement('span');g.className='tap-ring';g.style.left=x+'px';g.style.top=y+'px';
      var f=document.createElement('span');f.className='tap-fx';f.style.left=x+'px';f.style.top=y+'px';f.innerHTML=W;
      document.body.append(g,f);setTimeout(function(){g.remove();f.remove();},800);}
    b.classList.add('is-tapped');clearTimeout(b._t);b._t=setTimeout(function(){b.classList.remove('is-tapped');},900);
    if(b.dataset.copy){var t=document.getElementById('toast');var done=function(){t.textContent=b.dataset.msg;t.classList.add('show');setTimeout(function(){t.classList.remove('show');},2200);};
      if(navigator.clipboard){navigator.clipboard.writeText(b.dataset.copy).then(done,done);}else{done();}}
  });
})();
</script>
</body>
</html>
