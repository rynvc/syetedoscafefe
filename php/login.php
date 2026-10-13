<?php
session_start();
require_once 'db.php';

header('Content-Type: application/json');
$data = json_decode(file_get_contents("php://input"), true);

if (!isset($data['username']) || !isset($data['password'])) {
    echo json_encode(["status" => "error", "message" => "Missing credentials."]);
    exit();
}

$username = trim((string) $data['username']);
$password = trim((string) $data['password']);
$email = isset($data['email']) ? trim((string) $data['email']) : '';

if ($username === '' || $password === '') {
    echo json_encode(["status" => "error", "message" => "Username and password are required."]);
    exit();
}

if ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    echo json_encode(["status" => "error", "message" => "Please enter a valid email address."]);
    exit();
}

$stmt = $pdo->prepare("SELECT * FROM users WHERE username = ? LIMIT 1");
$stmt->execute([$username]);
$user = $stmt->fetch();

if (!$user) {
    echo json_encode(["status" => "error", "message" => "Invalid username or password."]);
    exit();
}

if ($email !== '') {
    $emailMatch = strtolower($user['email'] ?? '') === strtolower($email);
    if (!$emailMatch && empty($user['email'])) {
        $updateEmail = $pdo->prepare("UPDATE users SET email = ? WHERE user_id = ?");
        $updateEmail->execute([$email, $user['user_id']]);
    } elseif (!$emailMatch && !empty($user['email'])) {
        echo json_encode(["status" => "error", "message" => "This username is linked to a different email account."]);
        exit();
    }
}

if (password_verify($password, $user['password_hash'])) {
    $_SESSION['user_id'] = $user['user_id'];
    $_SESSION['role'] = $user['role'];
    $_SESSION['full_name'] = $user['full_name'];

    echo json_encode(["status" => "success", "role" => $user['role'], "name" => $user['full_name']]);
} else {
    echo json_encode(["status" => "error", "message" => "Invalid username or password."]);
}
?>