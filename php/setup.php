<?php
require_once __DIR__ . '/db.php';

$checks = [
    'email' => "SELECT COUNT(*) AS total FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'email'"
];

foreach ($checks as $columnName => $query) {
    $stmt = $pdo->query($query);
    $exists = $stmt->fetchColumn();

    if ((int) $exists === 0) {
        $alter = "ALTER TABLE users ADD COLUMN {$columnName} ";

        $alter .= 'VARCHAR(255) NULL AFTER full_name';

        $pdo->exec($alter);
    }
}

$pdo->prepare(
    "UPDATE users SET username = ?, password_hash = ?, full_name = ?, email = COALESCE(NULLIF(email, ''), ?)
    WHERE username = ?"
)->execute([
    'lemsther',
    '$2y$10$pKLF3HrpVgXWbDTUGRJTAOu8fgwTcKV/5nh89JekKYv4pjGkNY/jS',
    'Lemsther Rivera',
    'admin@gmail.com',
    'admin'
]);

header('Content-Type: application/json');
echo json_encode([
    'status' => 'success',
    'message' => 'User setup is ready.'
]);
