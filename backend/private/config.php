<?php
// RemoTap private settings. This folder is blocked from the web by .htaccess.
// Edit on Hostinger: File Manager > public_html > private > config.php
return [
    // Where new-order emails go (leave empty to skip email).
    'notify_email' => '',

    // Public site address used in profile links and QR codes, without a trailing slash,
    // e.g. 'https://remotap.com'. Leave empty to use whatever address the site is opened on.
    'base_url' => '',
];
// The admin password is created the first time you open /admin.php
// and stored (hashed) in data/admin.json. Delete that file to reset it.
