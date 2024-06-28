const TelegramBot = require('node-telegram-bot-api');
const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const fs = require('fs');

dotenv.config();

const prisma = new PrismaClient();

const telegramBotToken = process.env.TELEGRAM_TOKEN;

if (!telegramBotToken) {
    console.error("Token do bot do Telegram não encontrado no arquivo .env.");
    process.exit(1);
}

const bot = new TelegramBot(telegramBotToken, { polling: false });


async function handleEmail(message) {
    const email = message.text.trim().toLowerCase();

    try {
        const existingEmail = await prisma.email.findUnique({ where: { address: email } });

        if (existingEmail) {
            await bot.sendMessage(message.chat.id, `O email '${email}' já está registrado.`);
        } else {
            await prisma.email.create({
                data: {
                    address: email,
                    timestamp: new Date(),
                },
            });
            await bot.sendMessage(message.chat.id, `Obrigado! Entraremos em contato em breve.`);
        }
    } catch (error) {
        console.error('Erro ao salvar o email:', error);
        await bot.sendMessage(message.chat.id, 'Ocorreu um erro ao salvar seu email. Por favor, tente novamente mais tarde.');
    }
}


const chatState = {};


bot.on('message', async (message) => {
    const now = new Date();
    const hour = now.getHours();
    const isWorkingHours = hour >= 9 && hour < 18;
    const chatId = message.chat.id;

    if (isWorkingHours) {
        await bot.sendMessage(chatId, 'Olá! Confira nosso site: https://faesa.br');
    } else {

        if (chatState[chatId] === 'awaitingEmail') {

            delete chatState[chatId];
            await handleEmail(message);
        } else {

            chatState[chatId] = 'awaitingEmail';
            await bot.sendMessage(chatId, `Fora do horário comercial. Nosso horário de atendimento é de 09:00 às 18:00. Por favor, informe seu e-mail para entrarmos em contato.`);
        }
    }
});

console.log("Bot iniciado. Aguardando mensagens no link ==> https://web.telegram.org/a/#6926404403");


const lockFilePath = 'bot.lock';
if (fs.existsSync(lockFilePath)) {
    try {
        fs.unlinkSync(lockFilePath);
        console.log(`Arquivo '${lockFilePath}' removido com sucesso.`);
    } catch (err) {
        console.error(`Erro ao remover o arquivo '${lockFilePath}':`, err);
    }
}

bot.startPolling();
