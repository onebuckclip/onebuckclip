const nodemailer = require('nodemailer');
const fetch = require('node-fetch'); // Импорт node-fetch

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const data = JSON.parse(event.body);
    const { fileLink, crypto, email, websiteUrl, recaptchaToken } = data; // Получаем recaptchaToken

    // **Honeypot проверка на сервере (дополнительно к клиентской)**
    if (websiteUrl) {
        console.warn('Server-side honeypot triggered. Bot submission likely.');
        return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request' }) }; // Возвращаем ошибку
    }

    // **Валидация обязательных полей на сервере**
    if (!fileLink || !crypto || !email) {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Please fill in all fields' }) }; // Возвращаем ошибку валидации
    }

    // **reCAPTCHA Server-side Verification**
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY; // Получаем Secret key из переменных окружения
    const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;

    try {
        const recaptchaResponse = await fetch(recaptchaVerifyUrl, { method: 'POST' });
        const recaptchaData = await recaptchaResponse.json();

        if (!recaptchaData.success) {
            console.warn('reCAPTCHA verification failed:', recaptchaData);
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'reCAPTCHA verification failed' }) }; // Возвращаем ошибку reCAPTCHA
        }

        // **Дополнительная проверка score (опционально, для reCAPTCHA v3)**
        // const recaptchaScoreThreshold = 0.5; // Например, порог 0.5
        // if (recaptchaData.score < recaptchaScoreThreshold) {
        //     console.warn('reCAPTCHA score too low:', recaptchaData.score);
        //     return { statusCode: 400, body: JSON.stringify({ success: false, error: 'reCAPTCHA score too low' }) };
        // }


        // **Если reCAPTCHA прошла успешно, продолжаем отправку email**
        const ownerEmail = 'firstlesson@tutanota.com'; // Замените на email владельца
        const userEmail = email;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'bacunin.ma@google.com', // Замените на ваш Gmail
                pass: process.env.GMAIL_APP_PASSWORD // Используем App Password из переменной окружения
            }
        });

        // ... (код отправки email владельцу и клиенту - без изменений) ...

        await transporter.sendMail(ownerMailOptions);
        await transporter.sendMail(clientMailOptions);

        return {
            statusCode: 200,
            body: JSON.stringify({ success: true, message: 'Emails sent successfully' }),
        };


    } catch (error) {
        console.error('Ошибка reCAPTCHA или отправки email:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, error: 'Failed to process order' }),
        };
    }
};
