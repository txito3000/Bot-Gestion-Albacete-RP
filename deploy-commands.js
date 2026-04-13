const { REST, Routes, SlashCommandBuilder } = require('discord.js');

const TOKEN = 'MTQ5MjkxMTMzODQ1OTIzNDMxNA.GxqS4a.1uRtk_8Mqj2RCD5itbHdDtCcVS-FTeIfejeMTU';
const CLIENT_ID = '1492911338459234314';   // ← ID de tu bot (Application ID)
const GUILD_ID = '1397737510167117864';    // ← ID del servidor donde quieres los comandos

const commands = [
    new SlashCommandBuilder()
        .setName('votacion')
        .setDescription('Crea votación de apertura de servidor (30 minutos)'),
    
    new SlashCommandBuilder()
        .setName('abrirserver')
        .setDescription('Abre el servidor manualmente'),
    
    new SlashCommandBuilder()
        .setName('cerrarserver')
        .setDescription('Cierra el servidor'),
    
    new SlashCommandBuilder()
        .setName('cancelarvotacion')
        .setDescription('Cancela la votación activa en este canal')
].map(cmd => cmd.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log('🚀 Registrando comandos en el servidor específico...');

        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );

        console.log('✅ ¡Todos los comandos se registraron correctamente!');
        console.log('Ahora ve a Discord, escribe / y deberían aparecer casi inmediatamente.');

    } catch (error) {
        console.error('❌ Error al registrar los comandos:', error);
    }
})();