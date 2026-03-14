<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// ── CONFIG ──────────────────────────────────
define('BREVO_API_KEY', 'YOUR_BREVO_API_KEY');
define('BREVO_LIST_ID', 0); // Replace with your Brevo List ID (integer)
// ────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed.']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
$email = isset($input['email']) ? trim($input['email']) : '';

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Please enter a valid email address.']);
    exit;
}

$payload = json_encode([
    'email'         => $email,
    'listIds'       => [BREVO_LIST_ID],
    'updateEnabled' => true,
    'attributes'    => [
        'SOURCE' => 'liboworld.com waitlist',
        'SIGNUP_DATE' => date('Y-m-d'),
    ],
]);

$ch = curl_init('https://api.brevo.com/v3/contacts');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => [
        'accept: application/json',
        'api-key: ' . BREVO_API_KEY,
        'content-type: application/json',
    ],
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

// 201 = created, 204 = updated (already exists)
if ($httpCode === 201 || $httpCode === 204) {
    echo json_encode(['success' => true, 'message' => "You're on the list! We'll be in touch."]);
} elseif ($httpCode === 400 && isset($result['code']) && $result['code'] === 'duplicate_parameter') {
    echo json_encode(['success' => true, 'message' => "You're already on the list!"]);
} else {
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Something went wrong. Please try again.']);
}
