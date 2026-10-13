<?php
// Start Session
session_start();

// Setting CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Setting Header for JSON
header('Content-Type: application/json; charset=utf-8');

// Function for Response JSON
function jsonResponse($success, $message = '', $data = []) {
    $response = ['success' => $success];
    if ($message) $response['message'] = $message;
    if ($data) $response = array_merge($response, $data);
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit;
}

// Review the request
$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    // Connect to the database
    require_once 'config.php';

    ensureSchema($pdo);
    
    switch ($action) {
        case 'send':
            sendMessage($pdo);
            break;
        case 'get':
            getMessages($pdo);
            break;
        default:
            jsonResponse(false, 'Action not specified');
    }
} catch (Exception $e) {
    jsonResponse(false, 'خطا در سرور: ' . $e->getMessage());
}

// Ensure the messages table has all required columns (migration for existing installs)
function ensureSchema($pdo) {
    $stmt = $pdo->query("SHOW COLUMNS FROM messages LIKE 'reply_to'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE messages ADD COLUMN reply_to INT DEFAULT NULL AFTER message");
    }
    $stmt = $pdo->query("SHOW COLUMNS FROM messages LIKE 'reply_to_username'");
    if ($stmt->rowCount() == 0) {
        $pdo->exec("ALTER TABLE messages ADD COLUMN reply_to_username VARCHAR(50) DEFAULT NULL AFTER reply_to");
    }
}

// Function to send message
function sendMessage($pdo) {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        jsonResponse(false, 'Method not allowed');
    }
    
    $username = $_POST['username'] ?? '';
    $message = $_POST['message'] ?? '';
    $replyTo = isset($_POST['reply_to']) ? intval($_POST['reply_to']) : 0;
    
    if (empty($username) || strlen($username) > 50) {
        jsonResponse(false, 'نام کاربری معتبر نیست');
    }
    
    if (empty($message) || strlen($message) > 500) {
        jsonResponse(false, 'پیام معتبر نیست');
    }
    
    $username = htmlspecialchars(trim($username), ENT_QUOTES, 'UTF-8');
    $message = htmlspecialchars(trim($message), ENT_QUOTES, 'UTF-8');
    
    // Validate reply_to references an existing message and capture the author's username
    $replyToId = null;
    $replyToUsername = null;
    if ($replyTo > 0) {
        $stmt = $pdo->prepare("SELECT id, username FROM messages WHERE id = ?");
        $stmt->execute([$replyTo]);
        $replyMsg = $stmt->fetch();
        if ($replyMsg) {
            $replyToId = $replyTo;
            $replyToUsername = $replyMsg['username'];
        }
    }
    
    $lastMessage = checkLastMessage($pdo, $username, $message, $replyToId);
    if ($lastMessage) {
        jsonResponse(true, 'پیام با موفقیت ارسال شد', ['message_id' => $lastMessage['id']]);
        return;
    }
    
    $stmt = $pdo->prepare("INSERT INTO messages (username, message, reply_to, reply_to_username) VALUES (?, ?, ?, ?)");
    $result = $stmt->execute([$username, $message, $replyToId, $replyToUsername]);
    
    if (!$result) {
        jsonResponse(false, 'خطا در ذخیره پیام');
    }
    
    $messageId = $pdo->lastInsertId();
    
    cleanupOldMessages($pdo);
    
    jsonResponse(true, 'پیام با موفقیت ارسال شد', ['message_id' => $messageId]);
}

// Function to check last message
function checkLastMessage($pdo, $username, $message, $replyToId) {
    $stmt = $pdo->prepare("
        SELECT id, username, message 
        FROM messages 
        WHERE username = ? AND message = ? AND reply_to <=> ?
        AND created_at >= DATE_SUB(NOW(), INTERVAL 5 SECOND)
        ORDER BY id DESC 
        LIMIT 1
    ");
    $stmt->execute([$username, $message, $replyToId]);
    return $stmt->fetch();
}

// Function to get messages
function getMessages($pdo) {
    $lastId = isset($_GET['last_id']) ? intval($_GET['last_id']) : 0;
    
    $stmt = $pdo->prepare("
        SELECT m.id, m.username, m.message, m.created_at, m.reply_to,
               COALESCE(m.reply_to_username, r.username) AS reply_to_username,
               r.message AS reply_to_message
        FROM messages m
        LEFT JOIN messages r ON m.reply_to = r.id
        WHERE m.id > ?
        ORDER BY m.created_at ASC
        LIMIT 100
    ");
    $stmt->execute([$lastId]);
    $messages = $stmt->fetchAll();
    
    $newLastId = $lastId;
    if (!empty($messages)) {
        $newLastId = end($messages)['id'];
    }
    
    jsonResponse(true, '', [
        'messages' => $messages,
        'last_id' => $newLastId
    ]);
}

// Function to clear messages
function cleanupOldMessages($pdo) {
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM messages");
    $result = $stmt->fetch();
    $count = $result['count'];
    
    $maxMessages = defined('MAX_MESSAGES') ? MAX_MESSAGES : 50;
    if ($count > $maxMessages) {
        $toDelete = $count - $maxMessages;
        
        $stmt = $pdo->prepare("DELETE FROM messages ORDER BY created_at ASC LIMIT ?");
        $stmt->execute([$toDelete]);
    }
}
?>