<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

// ── CONFIG ──────────────────────────────────
$csvFile   = __DIR__ . '/waitlist.csv';
$notifyEmail = 'hello@liboworld.com'; // set to '' to disable notification emails
// ────────────────────────────────────────────

// Parse email from request
$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? strtolower(trim($input['email'])) : '';

// Validate
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

// Basic rate limiting — max 5 signups per IP per hour
$ipLogFile = sys_get_temp_dir() . '/libo_rate_' . md5($_SERVER['REMOTE_ADDR']) . '.txt';
$now = time();
$attempts = [];
if (file_exists($ipLogFile)) {
    $attempts = array_filter(explode(',', file_get_contents($ipLogFile)), fn($t) => $now - (int)$t < 3600);
}
if (count($attempts) >= 5) {
    http_response_code(429);
    echo json_encode(['success' => false, 'message' => 'Too many attempts. Please try again later.']);
    exit;
}
$attempts[] = $now;
file_put_contents($ipLogFile, implode(',', $attempts));

// Create CSV with headers if it doesn't exist
if (!file_exists($csvFile)) {
    file_put_contents($csvFile, "email,date,ip\n");
}

// Check for duplicate
$existing = file_get_contents($csvFile);
if (strpos($existing, $email) !== false) {
    echo json_encode(['success' => true, 'message' => "You're already on the list — see you at launch!"]);
    exit;
}

// Append to CSV
$line = sprintf(
    "%s,%s,%s\n",
    $email,
    date('Y-m-d H:i:s'),
    $_SERVER['REMOTE_ADDR']
);

if (file_put_contents($csvFile, $line, FILE_APPEND | LOCK_EX) === false) {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Could not save. Please try again.']);
    exit;
}

// Optional: send notification email to yourself
if (!empty($notifyEmail)) {
    mail(
        $notifyEmail,
        'New Libo Waitlist Signup',
        "New signup: $email\nDate: " . date('Y-m-d H:i:s') . "\n",
        "From: noreply@liboworld.com"
    );
}

echo json_encode(['success' => true, 'message' => "You're on the list! We'll let you know when Libo launches."]);
