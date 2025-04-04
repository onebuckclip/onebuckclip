const nodemailer = require('nodemailer'); // Для отправки email

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            body: 'Method Not Allowed',
        };
    }

    const data = JSON.parse(event.body);
    const { fileLink, crypto, email, websiteUrl } = data; // Получаем значение honeypot поля

    // Honeypot проверка - если поле websiteUrl заполнено, считаем это ботом
    if (websiteUrl) {
        console.warn("Honeypot triggered - likely bot activity. Request rejected.");
        return {
            statusCode: 400, // Или 403 Forbidden
            body: JSON.stringify({ success: false, error: "Honeypot validation failed" }), // Можно вернуть более общее сообщение об ошибке
        };
    }

    // Дальнейшая валидация и обработка только если honeypot не сработал
    if (!fileLink || !crypto || !email) { // Проверка обязательных полей (пример, можно добавить более строгую валидацию)
        return {
            statusCode: 400,
            body: JSON.stringify({ success: false, error: 'Пожалуйста, заполните все поля.' }),
        };
    }

    // !!! ВАЖНО !!!
    // Настройте данные для отправки email
    const ownerEmail = 'firstlesson@tutanota.com'; // Замените на email владельца
    const userEmail = email; // Email клиента

    // Настройки Nodemailer для отправки email (например, через Gmail)
    const transporter = nodemailer.createTransport({
        service: 'gmail', // или другой почтовый сервис
        auth: {
            user: 'bacunin.ma@gmail.com', // Замените на ваш Gmail
            pass: process.env.GMAIL_APP_PASSWORD // Используем App Password из переменных окружения
        }
    });

    // Email владельцу сайта
    const ownerMailOptions = {
        from: 'Лендинг заказов firstlesson@tutanota.com', // Отправитель (можно настроить)
        to: ownerEmail,
        subject: 'Новый заказ с лендинга',
        text: `Время заказа: ${new Date().toLocaleString()}
Ссылка на файлы: ${fileLink}
Выбранная криптовалюта: ${crypto}
Email клиента: ${email}`
    };

    // Email подтверждение клиенту
    const clientMailOptions = {
        from: 'Лендинг заказов firstlesson@tutanota.com',
        to: userEmail,
        subject: 'Ваш заказ принят',
        text: `Спасибо за заказ! Ваши данные:
- Ссылка на файлы: ${fileLink}
- Время принятия заказа: ${new Date().toLocaleString()}
Мы свяжемся с вами в ближайшее время.`
    };

    try {
        await transporter.sendMail(ownerMailOptions); // Отправка email владельцу
        await transporter.sendMail(clientMailOptions); // Отправка email клиенту

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Emails sent successfully' }),
        };
    } catch (error) {
        console.error('Ошибка отправки email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: 'Failed to send emails' }),
        };
    }
};
