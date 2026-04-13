// ======================
// 1. CARGAR VARIABLES DE ENTORNO (.env)
// ======================
require('dotenv').config();

// ======================
// 2. SERVIDOR HTTP PARA RENDER (obligatorio)
// ======================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('✅ Bot de Discord está vivo y funcionando en Render');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP corriendo en puerto ${PORT}`);
});

// ======================
// 3. BOT DE DISCORD.JS + SISTEMA DE SANCIONES
// ======================
const { Client, GatewayIntentBits, EmbedBuilder, PermissionsBitField, SlashCommandBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages
    ]
});

const SANCTIONS_FILE = path.join(__dirname, 'sanciones.json');
let sanciones = {}; // { guildId: [array de sanciones] }

// ==================== CARGAR / GUARDAR ====================
function cargarSanciones() {
    if (fs.existsSync(SANCTIONS_FILE)) {
        try {
            sanciones = JSON.parse(fs.readFileSync(SANCTIONS_FILE, 'utf-8'));
            console.log('✅ Sanciones cargadas correctamente.');
        } catch (error) {
            console.error('❌ Error al cargar sanciones:', error);
            sanciones = {};
        }
    } else {
        sanciones = {};
        console.log('ℹ️  Archivo sanciones.json creado.');
    }
}

function guardarSanciones() {
    try {
        fs.writeFileSync(SANCTIONS_FILE, JSON.stringify(sanciones, null, 4), 'utf-8');
    } catch (error) {
        console.error('❌ Error al guardar sanciones:', error);
    }
}

// ==================== EVENTO READY ====================
client.once('ready', async () => {
    cargarSanciones();
    console.log(`✅ Bot conectado como ${client.user.tag}`);
    console.log(`🌍 Conectado en ${client.guilds.cache.size} servidores`);

    const commands = [
        new SlashCommandBuilder()
            .setName('sancionar')
            .setDescription('Registra una sanción')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a sancionar').setRequired(true))
            .addStringOption(opt => 
                opt.setName('gravedad')
                    .setDescription('Tipo de sanción')
                    .setRequired(true)
                    .addChoices(
                        { name: '⚠️ Aviso', value: 'aviso' },
                        { name: '📝 Falta Leve', value: 'leve' },
                        { name: '⚠️ Falta Moderada', value: 'moderada' },
                        { name: '🚨 Falta Grave', value: 'grave' }
                    ))
            .addStringOption(opt => opt.setName('razon').setDescription('Razón de la sanción').setRequired(false)),

        new SlashCommandBuilder()
            .setName('sanciones')
            .setDescription('Ver todas las sanciones del servidor'),

        new SlashCommandBuilder()
            .setName('sanciones_usuario')
            .setDescription('Ver sanciones de un usuario')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)),

        new SlashCommandBuilder()
            .setName('eliminarsancion')
            .setDescription('Eliminar una sanción por ID')
            .addIntegerOption(opt => opt.setName('id').setDescription('ID de la sanción').setRequired(true)),

        new SlashCommandBuilder()
            .setName('limpiarsanciones')
            .setDescription('Eliminar TODAS las sanciones de un usuario')
            .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true)),
    ];

    // Registrar comandos slash en todos los servidores
    for (const guild of client.guilds.cache.values()) {
        try {
            await guild.commands.set(commands);
            console.log(`✅ Comandos / registrados en: ${guild.name}`);
        } catch (err) {
            console.error(`❌ Error al registrar comandos en ${guild.name}:`, err);
        }
    }
});

// ==================== COMANDO DE PRUEBA ====================
client.on('messageCreate', async message => {
    if (message.author.bot) return;
    if (message.content.toLowerCase() === '!ping') {
        message.reply('Pong! 🏓');
    }
});

// ==================== INTERACCIONES (SLASH COMMANDS) ====================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    // Permiso de moderación
    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: '❌ No tienes permisos suficientes.', ephemeral: true });
    }

    // ==================== /sancionar ====================
    if (commandName === 'sancionar') {
        const miembro = interaction.options.getMember('usuario');
        const gravedad = interaction.options.getString('gravedad');
        let razon = interaction.options.getString('razon') || 'Sin razón especificada';

        const mapaGravedad = {
            'aviso': '⚠️ Aviso',
            'leve': '📝 Falta Leve',
            'moderada': '⚠️ Falta Moderada',
            'grave': '🚨 Falta Grave'
        };

        const tipo = mapaGravedad[gravedad];
        const guildId = interaction.guild.id;

        if (!sanciones[guildId]) sanciones[guildId] = [];

        const sanctionId = sanciones[guildId].length + 1;

        const registro = {
            id: sanctionId,
            user_id: miembro.id,
            user_name: miembro.user.tag,
            mod_id: interaction.user.id,
            mod_name: interaction.user.tag,
            tipo: tipo,
            razon: razon,
            timestamp: new Date().toISOString()
        };

        sanciones[guildId].push(registro);
        guardarSanciones();

        const embedPublico = new EmbedBuilder()
            .setTitle('📋 Sanción Registrada')
            .setColor(0xFF0000)
            .setTimestamp()
            .addFields(
                { name: 'Usuario', value: `${miembro} (\`${miembro.id}\`)`, inline: false },
                { name: 'Tipo', value: tipo, inline: true },
                { name: 'Moderador', value: interaction.user.toString(), inline: true },
                { name: 'Razón', value: razon, inline: false }
            )
            .setFooter({ text: `Sanción ID: ${sanctionId}` });

        await interaction.reply({ embeds: [embedPublico] });

        const embedDM = new EmbedBuilder()
            .setTitle('📋 Has recibido una sanción')
            .setDescription('Esta sanción ha quedado registrada en el servidor.')
            .setColor(0xFF0000)
            .setTimestamp()
            .addFields(
                { name: 'Tipo', value: tipo },
                { name: 'Razón', value: razon },
                { name: 'Moderador', value: interaction.user.tag }
            )
            .setFooter({ text: `Servidor: ${interaction.guild.name} | ID: ${sanctionId}` });

        try {
            await miembro.send({ embeds: [embedDM] });
        } catch (err) {
            await interaction.followUp({ content: '⚠️ No se pudo enviar DM al usuario (mensajes privados desactivados).', ephemeral: true });
        }
    }

    // ==================== /sanciones ====================
    else if (commandName === 'sanciones') {
        const guildId = interaction.guild.id;
        const lista = sanciones[guildId] || [];

        if (lista.length === 0) {
            return interaction.reply({ content: '📭 No hay sanciones registradas.', ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Todas las sanciones del servidor (${lista.length})`)
            .setColor(0xFFA500);

        const ultimas = lista.slice(-15).reverse();
        ultimas.forEach(s => {
            embed.addFields({
                name: `ID: ${s.id} | ${s.user_name} • ${s.tipo}`,
                value: `**Razón:** ${s.razon}\n**Moderador:** ${s.mod_name}\n**Fecha:** <t:${Math.floor(new Date(s.timestamp).getTime() / 1000)}:R>`,
                inline: false
            });
        });

        if (lista.length > 15) embed.setFooter({ text: `Mostrando las últimas 15 de ${lista.length}` });

        await interaction.reply({ embeds: [embed] });
    }

    // ==================== /sanciones_usuario ====================
    else if (commandName === 'sanciones_usuario') {
        const miembro = interaction.options.getMember('usuario');
        const guildId = interaction.guild.id;
        const lista = sanciones[guildId] || [];
        const usuarioSanciones = lista.filter(s => s.user_id === miembro.id);

        if (usuarioSanciones.length === 0) {
            return interaction.reply({ content: `📭 **${miembro}** no tiene sanciones.`, ephemeral: true });
        }

        const embed = new EmbedBuilder()
            .setTitle(`📋 Sanciones de ${miembro.user.tag} (${usuarioSanciones.length})`)
            .setColor(0xFF0000)
            .setThumbnail(miembro.user.displayAvatarURL());

        usuarioSanciones.reverse().forEach(s => {
            embed.addFields({
                name: `ID: ${s.id} • ${s.tipo}`,
                value: `**Razón:** ${s.razon}\n**Moderador:** ${s.mod_name}\n**Fecha:** <t:${Math.floor(new Date(s.timestamp).getTime() / 1000)}:R>`,
                inline: false
            });
        });

        await interaction.reply({ embeds: [embed] });
    }

    // ==================== /eliminarsancion ====================
    else if (commandName === 'eliminarsancion') {
        const sanctionId = interaction.options.getInteger('id');
        const guildId = interaction.guild.id;
        const lista = sanciones[guildId] || [];

        const indice = lista.findIndex(s => s.id === sanctionId);
        if (indice === -1) {
            return interaction.reply({ content: `❌ No existe la sanción con ID \`${sanctionId}\`.`, ephemeral: true });
        }

        const usuario = lista[indice].user_name;
        lista.splice(indice, 1);
        sanciones[guildId] = lista;
        guardarSanciones();

        await interaction.reply(`✅ **Sanción ID ${sanctionId}** de **${usuario}** eliminada.`);
    }

    // ==================== /limpiarsanciones ====================
    else if (commandName === 'limpiarsanciones') {
        const miembro = interaction.options.getMember('usuario');
        const guildId = interaction.guild.id;
        const lista = sanciones[guildId] || [];
        const nuevas = lista.filter(s => s.user_id !== miembro.id);
        const eliminadas = lista.length - nuevas.length;

        if (eliminadas === 0) {
            return interaction.reply({ content: `📭 **${miembro}** no tenía sanciones.`, ephemeral: true });
        }

        sanciones[guildId] = nuevas;
        guardarSanciones();

        await interaction.reply(`🗑️ **${eliminadas} sanciones** de **${miembro}** eliminadas.`);
    }
});

// ======================
// 4. LOGIN DEL BOT (TOKEN desde .env)
// ======================
client.login(process.env.TOKEN)
    .catch(err => {
        console.error('❌ Error al iniciar sesión:', err);
    });