<?php
// Local test router for `php -S`: mimics the .htaccess rules.
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = $_SERVER['DOCUMENT_ROOT'];
if (preg_match('#^/p/([A-Za-z0-9_-]{1,64})/?$#', $uri, $m)) { $_GET['u'] = $m[1]; require $root . '/p.php'; return true; }
if (preg_match('#^/(data|private)(/|$)#', $uri)) { http_response_code(403); return true; }
if ($uri !== '/' && is_file($root . $uri)) return false;
if (is_file($root . rtrim($uri, '/') . '.html')) { header('Content-Type: text/html; charset=utf-8'); readfile($root . rtrim($uri, '/') . '.html'); return true; }
if ($uri === '/') return false;
http_response_code(404); readfile($root . '/404.html'); return true;
