<?php
$host = 'localhost';
$db   = 'syete_dos_cafe_db';
$user = 'root';
$pass = '';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (\PDOException $e) {
    http_response_code(503);
    echo json_encode([
        "status" => "error",
        "message" => "Database connection failed. Please start MySQL in XAMPP and make sure the syete_dos_cafe_db database exists."
    ]);
    exit();
}
?>