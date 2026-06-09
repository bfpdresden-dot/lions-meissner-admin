<?php
/**
 * Lions Club Upload Script
 * Auf Ihren Webserver hochladen (z.B. https://ihredomain.de/lions-upload/upload.php)
 *
 * Verzeichnisstruktur auf dem Server:
 *   /lions-upload/
 *     upload.php       <- diese Datei
 *     uploads/         <- wird automatisch erstellt
 */

$SECRET_KEY = "AENDERN_SIE_DIESEN_SCHLUESSEL"; // <-- unbedingt ändern!

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

$action = $_GET['action'] ?? 'upload';
$key    = $_GET['key']    ?? '';

if ($key !== $SECRET_KEY) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$uploadDir = __DIR__ . '/uploads/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// --- DELETE ---
if ($action === 'delete') {
    $url = $_POST['url'] ?? '';
    if (!$url) {
        http_response_code(400);
        echo json_encode(['error' => 'No URL']);
        exit;
    }
    $filename = basename(parse_url($url, PHP_URL_PATH));
    $filepath = $uploadDir . $filename;
    if (file_exists($filepath)) {
        unlink($filepath);
    }
    echo json_encode(['ok' => true]);
    exit;
}

// --- UPLOAD ---
if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_FILES['file'])) {
    http_response_code(400);
    echo json_encode(['error' => 'No file']);
    exit;
}

$file    = $_FILES['file'];
$allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

if (!in_array($file['type'], $allowed)) {
    http_response_code(400);
    echo json_encode(['error' => 'File type not allowed: ' . $file['type']]);
    exit;
}

if ($file['size'] > 20 * 1024 * 1024) {
    http_response_code(400);
    echo json_encode(['error' => 'File too large (max 20 MB)']);
    exit;
}

$ext      = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
$safeName = 'upload_' . uniqid('', true) . '.' . $ext;

if (!move_uploaded_file($file['tmp_name'], $uploadDir . $safeName)) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not save file']);
    exit;
}

$proto   = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$baseUrl = $proto . '://' . $_SERVER['HTTP_HOST'] . rtrim(dirname($_SERVER['REQUEST_URI']), '/');
$fileUrl = $baseUrl . '/uploads/' . $safeName;

echo json_encode(['url' => $fileUrl]);
