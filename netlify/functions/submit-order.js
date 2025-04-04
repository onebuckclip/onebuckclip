const nodemailer = require('nodemailer');
const fetch = require('node-fetch');

exports.handler = async function(event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const data = JSON.parse(event.body);
    const { fileLink, crypto, email, websiteUrl, recaptchaToken } = data;

    // **Honeypot проверка на сервере**
    if (websiteUrl) {
        console.warn('Server-side honeypot triggered. Bot submission likely.');
        return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Invalid request' }) };
    }

    // **Валидация обязательных полей на сервере**
    if (!fileLink || !crypto || !email) {
        return { statusCode: 400, body: JSON.stringify({ success: false, error: 'Please fill in all fields' }) };
    }

    // **reCAPTCHA Server-side Verification**
    const recaptchaSecretKey = process.env.RECAPTCHA_SECRET_KEY;
    if (!recaptchaSecretKey) {
        console.error('RECAPTCHA_SECRET_KEY environment variable is not set!');
        return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
    }
    const recaptchaVerifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${recaptchaSecretKey}&response=${recaptchaToken}`;

    try {
        const recaptchaResponse = await fetch(recaptchaVerifyUrl, { method: 'POST' });
        const recaptchaData = await recaptchaResponse.json();

        if (!recaptchaData.success) {
            console.warn('reCAPTCHA verification failed:', recaptchaData);
            return { statusCode: 400, body: JSON.stringify({ success: false, error: 'reCAPTCHA verification failed' }) };
        }

        // **Дополнительная проверка score (опционально)**
        // const recaptchaScoreThreshold = 0.5;
        // if (recaptchaData.score < recaptchaScoreThreshold) {
        //     console.warn('reCAPTCHA score too low:', recaptchaData.score);
        //     return { statusCode: 400, body: JSON.stringify({ success: false, error: 'reCAPTCHA score too low' }) };
        // }

        // **Если reCAPTCHA прошла успешно, продолжаем отправку email**
        const ownerEmail = 'firstlesson@tutanota.com'; // !!! ЗАМЕНИТЕ НА ВАШ EMAIL ВЛАДЕЛЬЦА !!!
        const userEmail = email;

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'bacunin.ma@gmail.com', // !!! ЗАМЕНИТЕ НА ВАШ GMAIL !!!
                pass: process.env.GMAIL_APP_PASSWORD // Используем App Password из переменной окружения
            }
        });

        if (!process.env.GMAIL_APP_PASSWORD) {
            console.error('GMAIL_APP_PASSWORD environment variable is not set!');
            return { statusCode: 500, body: JSON.stringify({ success: false, error: 'Server configuration error' }) };
        }

        // Email владельцу сайта
        const ownerMailOptions = {
            from: `Лендинг заказов <firstlesson@tutanota.com>`, // !!! УБЕДИТЕСЬ, ЧТО EMAIL СОВПАДАЕТ С auth.user !!!
            to: ownerEmail,
            subject: 'Новый заказ с лендинга',
            text: `Время заказа: ${new Date().toLocaleString()}
Ссылка на файлы: ${fileLink}
Выбранная криптовалюта: ${crypto}
Email клиента: ${email}`
        };

        // Email подтверждение клиенту
        const clientMailOptions = {
            from: `Лендинг заказов <bacunin.ma@gmail.com>`, // !!! УБЕДИТЕСЬ, ЧТО EMAIL СОВПАДАЕТ С auth.user !!!
            to: userEmail,
            subject: 'Ваш заказ принят',
            text: `Спасибо за заказ! Ваши данные:
- Ссылка на файлы: ${fileLink}
- Время принятия заказа: ${new Date().toLocaleString()}
Мы свяжемся с вами в ближайшее время.`
        };

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
