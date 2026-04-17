require('dotenv').config();

// ======================
// SERVIDOR HTTP PARA RENDER
// ======================
const express = require('express');
const app = express();
app.get('/', (req, res) => {
  res.send('✅ Bot de Discord Albacete RP está vivo y funcionando en Render');
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP corriendo en puerto ${PORT}`);
});

// ======================
// IMPORTS DE DISCORD.JS
// ======================
const {
  Client,
  GatewayIntentBits,
  EmbedBuilder,
  SlashCommandBuilder,
  PermissionsBitField,
  Events,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder
} = require('discord.js');

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

// ======================
// CONFIGURACIÓN
// ======================
const DNI_CHANNEL_ID = '1466563810784444478';
const CARNET_CHANNEL_ID = '1457570708497371332';
const LICENCIA_CHANNEL_ID = '1493631768169939136';

const POLICE_ROLES = [
  '1457537988132343858',
  '1457538324578439396',
  '1467525875007230055'
];

// ======================
// ARCHIVOS DE DATOS
// ======================
const SANCTIONS_FILE = path.join(__dirname, 'sanciones.json');
const IDENTIDADES_FILE = path.join(__dirname, 'identidades.json');
const TIENDA_FILE = path.join(__dirname, 'tienda.json');

let sanciones = {};
let identidades = {};
let tienda = {};

// ======================
// CARGAR / GUARDAR DATOS
// ======================
function cargarSanciones() {
  if (fs.existsSync(SANCTIONS_FILE)) {
    try {
      sanciones = JSON.parse(fs.readFileSync(SANCTIONS_FILE, 'utf-8'));
      console.log('✅ Sanciones cargadas correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar sanciones:', error.message);
      sanciones = {};
    }
  } else {
    sanciones = {};
    fs.writeFileSync(SANCTIONS_FILE, JSON.stringify({}, null, 4));
    console.log('ℹ️ Archivo sanciones.json creado.');
  }
}

function guardarSanciones() {
  try {
    fs.writeFileSync(SANCTIONS_FILE, JSON.stringify(sanciones, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar sanciones:', error.message);
  }
}

function cargarIdentidades() {
  if (fs.existsSync(IDENTIDADES_FILE)) {
    try {
      identidades = JSON.parse(fs.readFileSync(IDENTIDADES_FILE, 'utf-8'));
      console.log('✅ Identidades (DNI + Economía + Inventario) cargadas correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar identidades:', error.message);
      identidades = {};
    }
  } else {
    identidades = {};
    fs.writeFileSync(IDENTIDADES_FILE, JSON.stringify({}, null, 4));
    console.log('ℹ️ Archivo identidades.json creado.');
  }
}

function guardarIdentidades() {
  try {
    fs.writeFileSync(IDENTIDADES_FILE, JSON.stringify(identidades, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar identidades:', error.message);
  }
}

function cargarTienda() {
  if (fs.existsSync(TIENDA_FILE)) {
    try {
      tienda = JSON.parse(fs.readFileSync(TIENDA_FILE, 'utf-8'));
      console.log('✅ Tienda cargada correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar tienda:', error.message);
      tienda = {};
    }
  } else {
    tienda = {};
    fs.writeFileSync(TIENDA_FILE, JSON.stringify({}, null, 4));
    console.log('ℹ️ Archivo tienda.json creado.');
  }
}

function guardarTienda() {
  try {
    fs.writeFileSync(TIENDA_FILE, JSON.stringify(tienda, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar tienda:', error.message);
  }
}

function getUserData(guildId, userId) {
  if (!identidades[guildId]) identidades[guildId] = {};
  if (!identidades[guildId][userId]) {
    identidades[guildId][userId] = {
      pjs: {
        "1": { dni: null, carnetConducir: null, licenciaArmas: null },
        "2": { dni: null, carnetConducir: null, licenciaArmas: null }
      },
      dinero: 6000,
      lastSalary: null,
      purchases: []
    };
  } else {
    if (typeof identidades[guildId][userId].dinero !== 'number') identidades[guildId][userId].dinero = 6000;
    if (!identidades[guildId][userId].lastSalary) identidades[guildId][userId].lastSalary = null;
    if (!Array.isArray(identidades[guildId][userId].purchases)) identidades[guildId][userId].purchases = [];
  }
  return identidades[guildId][userId];
}

function getGuildTienda(guildId) {
  if (!tienda[guildId]) tienda[guildId] = [];
  return tienda[guildId];
}

// ======================
// ECONOMÍA
// ======================
const SALARY_BASE = 1500;
const ROLE_BONUSES = {
  '1467525875007230055': 1000,
  '1457538526173462670': 1000,
  '1457538324578439396': 1000,
  '1457537988132343858': 1000,
  '1457537819814789242': 800,
  '1457537536019665017': 1000,
  '1457537243714420797': 1000,
  '1457536868630532328': 1000,
  '1464767715083550966': -250,
};

// ======================
// ESTADO DEL SERVIDOR
// ======================
let serverAbierto = false;
let ultimaApertura = null;

// ======================
// VOTACIONES
// ======================
const votes = new Map();

function createProgressBar(votosQueCuentan, maximo = 5) {
  const porcentaje = Math.min(Math.round((votosQueCuentan / maximo) * 100), 100);
  const segmentos = Math.round(10 * (votosQueCuentan / maximo));
  const barra = '█'.repeat(segmentos) + '░'.repeat(10 - segmentos);
  return votosQueCuentan >= maximo
    ? `✅ **COMPLETADO** (${porcentaje}%)`
    : `${barra} **${porcentaje}%**`;
}

function getVoterList(pollData, type) {
  const list = [];
  for (const [userId, opcion] of pollData.voters.entries()) {
    if (opcion === type) {
      list.push(pollData.voterNames.get(userId) || 'Usuario desconocido');
    }
  }
  return list.length > 0 ? list.join(', ') : 'Nadie';
}

// ======================
// EVENTO READY
// ======================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  cargarSanciones();
  cargarIdentidades();
  cargarTienda();

  const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Ver latencia del bot'),
    new SlashCommandBuilder().setName('votacion').setDescription('Crea votación de apertura de servidor (30 minutos)'),
    new SlashCommandBuilder().setName('abrirserver').setDescription('Abre el servidor manualmente'),
    new SlashCommandBuilder().setName('cerrarserver').setDescription('Cierra el servidor'),
    new SlashCommandBuilder().setName('cancelarvotacion').setDescription('Cancela la votación activa en este canal'),
    new SlashCommandBuilder().setName('panel-dni').setDescription('Crea el panel oficial del sistema de DNI'),
    new SlashCommandBuilder().setName('arrestar').setDescription('🚔 Realizar arresto (solo Policía)'),
    new SlashCommandBuilder().setName('anuncio-rp').setDescription('📢 Crea un anuncio RP'),
    new SlashCommandBuilder().setName('estado-server').setDescription('📡 Muestra el estado del servidor'),
    // Sanciones y Multas
    new SlashCommandBuilder().setName('sancionar').setDescription('Registra una sanción').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('gravedad').setRequired(true).addChoices({ name: '⚠️ Aviso', value: 'aviso' }, { name: '📝 Falta Leve', value: 'leve' }, { name: '⚠️ Falta Moderada', value: 'moderada' }, { name: '🚨 Falta Grave', value: 'grave' })).addStringOption(opt => opt.setName('razon')),
    new SlashCommandBuilder().setName('sanciones').setDescription('Ver todas las sanciones del servidor'),
    new SlashCommandBuilder().setName('sanciones_usuario').setDescription('Ver sanciones de un usuario').addUserOption(opt => opt.setName('usuario').setRequired(true)),
    new SlashCommandBuilder().setName('eliminarsancion').setDescription('Eliminar una sanción por ID').addIntegerOption(opt => opt.setName('id').setRequired(true)),
    new SlashCommandBuilder().setName('multa').setDescription('💰 Registra una multa').addUserOption(opt => opt.setName('usuario').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setRequired(true)).addStringOption(opt => opt.setName('razon').setRequired(true)),
    // DNI Admin / Policía
    new SlashCommandBuilder().setName('borrar-dni-admin').setDescription('🔧 [ADMIN] Borra el DNI y documentos').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('ver-dni-admin').setDescription('🔧 [ADMIN] Ver DNI').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('buscar-dni').setDescription('🔍 Busca DNI (Policía/Staff)').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    new SlashCommandBuilder().setName('ver-dni').setDescription('🔍 Ver DNI público').addUserOption(opt => opt.setName('usuario').setRequired(true)).addStringOption(opt => opt.setName('pj').setRequired(true).addChoices({ name: 'PJ 1', value: '1' }, { name: 'PJ 2', value: '2' })),
    // Economía
    new SlashCommandBuilder().setName('balance').setDescription('💰 Ver tu dinero').addUserOption(opt => opt.setName('usuario')),
    new SlashCommandBuilder().setName('addmoney').setDescription('🔧 [ADMIN] Modificar dinero').addUserOption(opt => opt.setName('usuario').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setRequired(true)),
    new SlashCommandBuilder().setName('sueldo').setDescription('💼 Cobrar sueldo (cada 24h)'),
    new SlashCommandBuilder().setName('transferir').setDescription('💸 Transferir dinero').addUserOption(opt => opt.setName('usuario').setRequired(true)).addIntegerOption(opt => opt.setName('cantidad').setRequired(true)),
    new SlashCommandBuilder().setName('apostar').setDescription('🎲 Apostar cara o cruz').addIntegerOption(opt => opt.setName('cantidad').setRequired(true)).addStringOption(opt => opt.setName('opcion').setRequired(true).addChoices({ name: 'Cara', value: 'cara' }, { name: 'Cruz', value: 'cruz' })),
    new SlashCommandBuilder().setName('leaderboard').setDescription('🏆 Top 10 más ricos'),
    // TIENDA
    new SlashCommandBuilder().setName('agregar-producto').setDescription('[ADMIN] Añadir producto a la tienda').addStringOption(opt => opt.setName('nombre').setRequired(true)).addIntegerOption(opt => opt.setName('precio').setRequired(true)).addStringOption(opt => opt.setName('descripcion').setRequired(true)).addIntegerOption(opt => opt.setName('stock').setDescription('Stock inicial (0 = ilimitado)').setRequired(false)).addStringOption(opt => opt.setName('emoji').setRequired(false)),
    new SlashCommandBuilder().setName('borrar-producto').setDescription('[ADMIN] Borrar producto').addStringOption(opt => opt.setName('id').setRequired(true)),
    new SlashCommandBuilder().setName('actualizar-stock').setDescription('[ADMIN] Actualizar stock').addStringOption(opt => opt.setName('id').setRequired(true)).addIntegerOption(opt => opt.setName('nuevo_stock').setRequired(true)),
    new SlashCommandBuilder().setName('panel-tienda').setDescription('🛒 Crear panel de tienda'),
    new SlashCommandBuilder().setName('tienda').setDescription('Ver productos disponibles'),
    new SlashCommandBuilder().setName('comprar').setDescription('Comprar producto por ID').addStringOption(opt => opt.setName('id').setRequired(true)),
    new SlashCommandBuilder().setName('inventario').setDescription('🎒 Ver tu inventario'),
    new SlashCommandBuilder().setName('clear-tienda').setDescription('[ADMIN] Limpiar toda la tienda')
  ];

  for (const guild of client.guilds.cache.values()) {
    try {
      await guild.commands.set(commands);
      console.log(`✅ Comandos registrados en: ${guild.name}`);
    } catch (err) {
      console.error(`❌ Error al registrar comandos en ${guild.name}:`, err);
    }
  }
});

// ======================
// INTERACCIONES
// ======================
client.on(Events.InteractionCreate, async interaction => {
  try {
    if (interaction.isChatInputCommand()) {
      switch (interaction.commandName) {
        case 'ping': 
          return interaction.reply({ content: `🏓 Pong! **${client.ws.ping}ms**`, flags: MessageFlags.Ephemeral });
        case 'votacion': return handleVotacion(interaction);
        case 'abrirserver': return handleAbrirServer(interaction);
        case 'cerrarserver': return handleCerrarServer(interaction);
        case 'cancelarvotacion': return handleCancelarVotacion(interaction);
        case 'panel-dni': return handlePanelDni(interaction);
        case 'arrestar': return handleArrestar(interaction);
        case 'anuncio-rp': return handleAnuncioRp(interaction);
        case 'estado-server': return handleEstadoServer(interaction);
        case 'sancionar': return handleSancionar(interaction);
        case 'sanciones': return handleVerSanciones(interaction);
        case 'sanciones_usuario': return handleVerSancionesUsuario(interaction);
        case 'eliminarsancion': return handleEliminarSancion(interaction);
        case 'multa': return handleMulta(interaction);
        case 'borrar-dni-admin': return handleBorrarDniAdmin(interaction);
        case 'ver-dni-admin': return handleVerDniAdmin(interaction);
        case 'buscar-dni': return handleBuscarDni(interaction);
        case 'ver-dni': return handleVerDniPublico(interaction);
        case 'balance': return handleBalance(interaction);
        case 'addmoney': return handleAddMoney(interaction);
        case 'sueldo': return handleSueldo(interaction);
        case 'transferir': return handleTransferir(interaction);
        case 'apostar': return handleApostar(interaction);
        case 'leaderboard': return handleLeaderboard(interaction);
        // Tienda
        case 'agregar-producto': return handleAgregarProducto(interaction);
        case 'borrar-producto': return handleBorrarProducto(interaction);
        case 'actualizar-stock': return handleActualizarStock(interaction);
        case 'panel-tienda': return handlePanelTienda(interaction);
        case 'tienda': return handleVerTienda(interaction);
        case 'comprar': return handleComprar(interaction);
        case 'inventario': return handleInventario(interaction);
        case 'clear-tienda': return handleClearTienda(interaction);
      }
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;
      if (customId.startsWith('dni-') || customId.startsWith('carnet-') || customId.startsWith('licencia-')) {
        return handleDniButton(interaction);
      }
      return handleButtonVote(interaction);
    }

    if (interaction.isModalSubmit()) {
      return handleModalSubmit(interaction);
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'tienda-select') {
      return handleTiendaSelect(interaction);
    }
  } catch (error) {
    console.error('❌ Error global en InteractionCreate:', error);
    if (!interaction.replied && !interaction.deferred) {
      interaction.reply({ content: '❌ Ocurrió un error inesperado.', flags: MessageFlags.Ephemeral }).catch(() => {});
    }
  }
});

// ======================
// VOTACIONES COMPLETAS
// ======================
async function handleCancelarVotacion(interaction) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
  let pollData = null;
  let messageIdToCancel = null;
  for (const [msgId, data] of votes.entries()) {
    if (data.channel.id === interaction.channel.id) {
      pollData = data;
      messageIdToCancel = msgId;
      break;
    }
  }
  if (!pollData) return interaction.editReply({ content: '❌ No hay ninguna votación activa en este canal.' });

  const isCreator = pollData.creatorId === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isCreator && !isAdmin) {
    return interaction.editReply({ content: '❌ Solo el creador o un Administrador puede cancelarla.' });
  }

  if (pollData.timeout) clearTimeout(pollData.timeout);

  const cancelEmbed = EmbedBuilder.from(pollData.message.embeds[0])
    .setDescription('**❌ Votación cancelada manualmente**')
    .setColor(0xFF0000);

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
  );

  await pollData.message.edit({ embeds: [cancelEmbed], components: [disabledRow] });
  await interaction.editReply({ content: '✅ Votación cancelada correctamente.' });
  await pollData.channel.send('❌ **La votación ha sido cancelada manualmente.**');
  votes.delete(messageIdToCancel);
}

async function handleAbrirServer(interaction) {
  await interaction.deferReply();
  let pollData = null;
  let messageIdToRemove = null;
  for (const [msgId, data] of votes.entries()) {
    if (data.channel.id === interaction.channel.id) {
      pollData = data;
      messageIdToRemove = msgId;
      break;
    }
  }

  let mencionesSi = '';
  let mencionesTarde = '';
  if (pollData) {
    pollData.voters.forEach((opcion, userId) => {
      if (opcion === 'yes') mencionesSi += `<@${userId}> `;
      else if (opcion === 'later') mencionesTarde += `<@${userId}> `;
    });
    if (pollData.timeout) clearTimeout(pollData.timeout);
    votes.delete(messageIdToRemove);
  }

  serverAbierto = true;
  ultimaApertura = Date.now();
  const pingContent = `**Se unirán:** ${mencionesSi || '*Nadie*'}\n**Se unirán más tarde:** ${mencionesTarde || '*Nadie*'}`;

  const embed = new EmbedBuilder()
    .setTitle('🔓 ¡EL SERVIDOR ESTÁ ABIERTO!')
    .setDescription('**¡Atención!**\nTienen **10 minutos** para unirse al servidor.\n\n¡Que lo pasen genial!')
    .setColor(0x00FF00)
    .setImage('https://tenor.com/es/view/abierto-te-esperamos-local-negocio-letrero-gif-12287454104567600625')
    .setTimestamp();

  await interaction.editReply({ content: pingContent, embeds: [embed] });
}

async function abrirServidorAutomatico(channel, pollData) {
  let mencionesSi = '';
  let mencionesTarde = '';
  pollData.voters.forEach((opcion, userId) => {
    if (opcion === 'yes') mencionesSi += `<@${userId}> `;
    else if (opcion === 'later') mencionesTarde += `<@${userId}> `;
  });

  serverAbierto = true;
  ultimaApertura = Date.now();
  const pingContent = `**Se unirán:** ${mencionesSi || '*Nadie*'}\n**Se unirán más tarde:** ${mencionesTarde || '*Nadie*'}`;

  const embed = new EmbedBuilder()
    .setTitle('🔓 ¡EL SERVIDOR SE HA ABIERTO AUTOMÁTICAMENTE!')
    .setDescription('Se alcanzó el mínimo de **5 votos "Me uniré"**.\n\nTienen **10 minutos** para unirse.\n\n¡Diviértanse!')
    .setColor(0x00FF00)
    .setImage('https://tenor.com/es/view/abierto-te-esperamos-local-negocio-letrero-gif-12287454104567600625')
    .setTimestamp();

  await channel.send({ content: pingContent, embeds: [embed] });
}

async function handleCerrarServer(interaction) {
  await interaction.deferReply();
  serverAbierto = false;
  const embed = new EmbedBuilder()
    .setTitle('🔒 SERVIDOR CERRADO')
    .setDescription('**¡Gracias por unirse!**\n\nAgradecemos a todos los que participaron.\n\n¡Hasta la próxima!')
    .setColor(0xFF0000)
    .setTimestamp();
  await interaction.editReply({ content: '@everyone', embeds: [embed] });
}

async function cerrarVotacionPorTiempo(messageId) {
  const pollData = votes.get(messageId);
  if (!pollData) return;

  const nuevoEmbed = EmbedBuilder.from(pollData.message.embeds[0])
    .setDescription('**⏰ Votación expirada**\nLa votación ha durado 30 minutos y se ha cerrado automáticamente.')
    .setColor(0xFF9900);

  const disabledRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰').setDisabled(true),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
  );

  try {
    await pollData.message.edit({ embeds: [nuevoEmbed], components: [disabledRow] });
    await pollData.channel.send('⏰ **La votación ha expirado** después de 30 minutos.');
  } catch (error) {
    console.error('❌ Error al cerrar votación por tiempo:', error);
  }

  if (pollData.timeout) clearTimeout(pollData.timeout);
  votes.delete(messageId);
}

async function handlePanelDni(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden crear el panel de DNI.', flags: MessageFlags.Ephemeral });
  }
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle('🪪 SISTEMA OFICIAL DE DNI - ALBACETE RP')
    .setDescription('**Cada jugador puede tener hasta 2 personajes (PJ1 y PJ2).**\n\n• Crea tu DNI con tus datos reales del personaje.\n• Con el DNI podrás sacar **Carnet de Conducir** y **Licencia de Armas**.\n• Solo tú puedes gestionar tus documentos.\n\nUsa los botones de abajo:')
    .setColor(0x00FFAA)
    .setTimestamp();

  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('dni-crear').setLabel('Crear DNI').setStyle(ButtonStyle.Primary).setEmoji('🪪'),
    new ButtonBuilder().setCustomId('dni-ver').setLabel('Ver DNI').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('dni-borrar').setLabel('Borrar DNI').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('carnet-crear').setLabel('Crear Carnet Conducir').setStyle(ButtonStyle.Primary).setEmoji('🚗'),
    new ButtonBuilder().setCustomId('carnet-ver').setLabel('Ver Carnet').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('carnet-borrar').setLabel('Borrar Carnet').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('licencia-crear').setLabel('Crear Licencia Armas').setStyle(ButtonStyle.Primary).setEmoji('🔫'),
    new ButtonBuilder().setCustomId('licencia-ver').setLabel('Ver Licencia').setStyle(ButtonStyle.Secondary).setEmoji('🔎'),
    new ButtonBuilder().setCustomId('licencia-borrar').setLabel('Borrar Licencia').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
  );

  await interaction.channel.send({ embeds: [embed], components: [row1, row2, row3] });
  await interaction.editReply({ content: '✅ Panel de DNI creado correctamente.' });
}

async function handleDniButton(interaction) {
  try {
    const customId = interaction.customId;
    let modal;

    if (customId === 'dni-crear') {
      modal = new ModalBuilder().setCustomId('modal-dni-crear').setTitle('🪪 Crear DNI');
      modal.addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ (1 o 2)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nombreCompleto').setLabel('Nombre Completo').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fechaNac').setLabel('Fecha de Nacimiento (DD/MM/AAAA)').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nacionalidad').setLabel('Nacionalidad').setStyle(TextInputStyle.Short).setRequired(true)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('genero').setLabel('Género').setStyle(TextInputStyle.Short).setRequired(true))
      );
    } else if (customId === 'dni-ver' || customId === 'dni-borrar') {
      modal = new ModalBuilder()
        .setCustomId(customId === 'dni-ver' ? 'modal-dni-ver' : 'modal-dni-borrar')
        .setTitle(customId === 'dni-ver' ? '🔎 Ver DNI' : '🗑️ Borrar DNI');
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ (1 o 2)').setStyle(TextInputStyle.Short).setRequired(true)));
    } else if (customId.startsWith('carnet-') || customId.startsWith('licencia-')) {
      const tipo = customId.startsWith('carnet') ? 'carnet' : 'licencia';
      const action = customId.split('-')[1];
      const titulo = tipo === 'carnet'
        ? (action === 'crear' ? '🚗 Crear Carnet' : action === 'ver' ? '🔎 Ver Carnet' : '🗑️ Borrar Carnet')
        : (action === 'crear' ? '🔫 Crear Licencia' : action === 'ver' ? '🔎 Ver Licencia' : '🗑️ Borrar Licencia');
      modal = new ModalBuilder().setCustomId(`modal-${tipo}-${action}`).setTitle(titulo);
      modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('Número de PJ (1 o 2)').setStyle(TextInputStyle.Short).setRequired(true)));
    }

    if (modal) await interaction.showModal(modal);
  } catch (error) {
    console.error('❌ Error en handleDniButton:', error);
  }
}

async function handleModalSubmit(interaction) {
  try {
    const customId = interaction.customId;
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const userData = getUserData(guildId, userId);

    // DNI Crear
    if (customId === 'modal-dni-crear') {
      const pj = interaction.fields.getTextInputValue('pj').trim();
      const nombreCompleto = interaction.fields.getTextInputValue('nombreCompleto').trim();
      const fechaNac = interaction.fields.getTextInputValue('fechaNac').trim();
      const nacionalidad = interaction.fields.getTextInputValue('nacionalidad').trim();
      const genero = interaction.fields.getTextInputValue('genero').trim();

      if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      if (userData.pjs[pj].dni) return interaction.reply({ content: `❌ Ya tienes DNI en PJ${pj}.`, flags: MessageFlags.Ephemeral });
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(fechaNac)) return interaction.reply({ content: '❌ Formato de fecha incorrecto (DD/MM/AAAA).', flags: MessageFlags.Ephemeral });

      const [nombre, ...apellidoParts] = nombreCompleto.split(' ');
      const apellido = apellidoParts.join(' ') || 'Sin apellido';
      const dniNumero = Math.floor(10000000 + Math.random() * 90000000).toString();
      const fechaCreacion = new Date().toLocaleDateString('es-ES');

      userData.pjs[pj].dni = { numero: dniNumero, nombre, apellido, fechaNac, nacionalidad, genero, fechaCreacion };
      guardarIdentidades();

      const embed = new EmbedBuilder()
        .setTitle(`✅ DNI Creado - PJ${pj}`)
        .setColor(0x00FFAA)
        .addFields(
          { name: 'DNI', value: dniNumero, inline: true },
          { name: 'Nombre Completo', value: `${nombre} ${apellido}`, inline: true },
          { name: 'Fecha Nacimiento', value: fechaNac, inline: true },
          { name: 'Nacionalidad', value: nacionalidad, inline: true },
          { name: 'Género', value: genero, inline: true }
        );
      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    // DNI Ver / Borrar
    if (customId === 'modal-dni-ver' || customId === 'modal-dni-borrar') {
      const pj = interaction.fields.getTextInputValue('pj').trim();
      if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      const dni = userData.pjs[pj].dni;
      if (!dni) return interaction.reply({ content: `❌ No tienes DNI en PJ${pj}.`, flags: MessageFlags.Ephemeral });

      if (customId === 'modal-dni-ver') {
        const embed = new EmbedBuilder()
          .setTitle(`🔎 DNI - PJ${pj}`)
          .setColor(0x00AAFF)
          .addFields(
            { name: 'DNI', value: dni.numero, inline: true },
            { name: 'Nombre', value: `${dni.nombre} ${dni.apellido}`, inline: true },
            { name: 'Fecha Nac.', value: dni.fechaNac, inline: true }
          );
        const channel = interaction.guild.channels.cache.get(DNI_CHANNEL_ID);
        if (channel) await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ DNI enviado al canal.`, flags: MessageFlags.Ephemeral });
      } else {
        userData.pjs[pj].dni = null;
        userData.pjs[pj].carnetConducir = null;
        userData.pjs[pj].licenciaArmas = null;
        guardarIdentidades();
        await interaction.reply({ content: `🗑️ DNI y documentos de PJ${pj} eliminados.`, flags: MessageFlags.Ephemeral });
      }
      return;
    }

    // Carnet y Licencia
    if (customId.startsWith('modal-carnet-') || customId.startsWith('modal-licencia-')) {
      const tipo = customId.includes('carnet') ? 'carnet' : 'licencia';
      const action = customId.split('-')[2];
      const pj = interaction.fields.getTextInputValue('pj').trim();

      if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', flags: MessageFlags.Ephemeral });
      const dni = userData.pjs[pj].dni;
      if (!dni) return interaction.reply({ content: `❌ Primero debes crear el DNI del PJ${pj}.`, flags: MessageFlags.Ephemeral });

      if (action === 'crear') {
        const key = tipo === 'carnet' ? 'carnetConducir' : 'licenciaArmas';
        if (userData.pjs[pj][key]) return interaction.reply({ content: `❌ Ya tienes ${tipo} en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

        const numero = tipo === 'carnet' ? `CC-${Math.floor(1000 + Math.random() * 9000)}` : `LA-${Math.floor(1000 + Math.random() * 9000)}`;
        const fecha = new Date().toLocaleDateString('es-ES');
        userData.pjs[pj][key] = { numero, fechaEmision: fecha };
        guardarIdentidades();
        await interaction.reply({ content: `✅ ${tipo === 'carnet' ? 'Carnet de Conducir' : 'Licencia de Armas'} creado para PJ${pj}\n**Número:** ${numero}`, flags: MessageFlags.Ephemeral });
      } else if (action === 'ver' || action === 'borrar') {
        const key = tipo === 'carnet' ? 'carnetConducir' : 'licenciaArmas';
        const doc = userData.pjs[pj][key];
        if (!doc) return interaction.reply({ content: `❌ No tienes ${tipo} en el PJ${pj}.`, flags: MessageFlags.Ephemeral });

        if (action === 'ver') {
          const embed = new EmbedBuilder()
            .setTitle(`${tipo === 'carnet' ? '🚗 CARNET DE CONDUCIR' : '🔫 LICENCIA DE ARMAS'} - PJ${pj}`)
            .setColor(tipo === 'carnet' ? 0x00FF88 : 0xFF8800)
            .addFields({ name: 'Número', value: doc.numero, inline: true }, { name: 'Emitido', value: doc.fechaEmision, inline: true });
          const channelId = tipo === 'carnet' ? CARNET_CHANNEL_ID : LICENCIA_CHANNEL_ID;
          const channel = interaction.guild.channels.cache.get(channelId);
          if (channel) await channel.send({ embeds: [embed] });
          await interaction.reply({ content: `✅ ${tipo} enviado al canal.`, flags: MessageFlags.Ephemeral });
        } else {
          userData.pjs[pj][key] = null;
          guardarIdentidades();
          await interaction.reply({ content: `🗑️ ${tipo} del PJ${pj} eliminado.`, flags: MessageFlags.Ephemeral });
        }
      }
      return;
    }

    // Arresto
    if (customId === 'modal-arrestar') {
      const nombreIC = interaction.fields.getTextInputValue('nombre_ic');
      const articulos = interaction.fields.getTextInputValue('articulos');
      const policias = interaction.fields.getTextInputValue('policias');
      const tiempo = interaction.fields.getTextInputValue('tiempo');

      const embed = new EmbedBuilder()
        .setTitle('🚔 ARRESTO REGISTRADO')
        .setColor(0xFF0000)
        .addFields(
          { name: 'Nombre IC', value: nombreIC, inline: false },
          { name: 'Artículos', value: articulos, inline: false },
          { name: 'Policías', value: policias, inline: false },
          { name: 'Tiempo en cárcel', value: tiempo, inline: false }
        );
      await interaction.reply({ embeds: [embed] });
    }
  } catch (error) {
    console.error('❌ Error en handleModalSubmit:', error);
    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply({ content: '❌ Error al procesar el formulario.', flags: MessageFlags.Ephemeral });
    }
  }
}

// ======================
// COMANDOS ADMIN DNI + POLICÍA + SANCIONES
// ======================

async function handleBorrarDniAdmin(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);

  if (!userData.pjs[pj].dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  userData.pjs[pj].dni = null;
  userData.pjs[pj].carnetConducir = null;
  userData.pjs[pj].licenciaArmas = null;
  guardarIdentidades();

  await interaction.reply(`✅ **DNI y todos los documentos del PJ${pj} de ${target} han sido eliminados.**`);
}

async function handleVerDniAdmin(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔎 DNI de ${target.user.tag} - PJ${pj}`)
    .setColor(0x00AAFF)
    .addFields(
      { name: 'DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    )
    .setThumbnail(target.user.displayAvatarURL());

  await interaction.reply({ embeds: [embed] });
}

async function handleBuscarDni(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía y Staff pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI registrado en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 DNI ENCONTRADO - PJ${pj}`)
    .setColor(0x00AAFF)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: '👤 Usuario', value: `${target} (\`${target.id}\`)`, inline: false },
      { name: '🪪 DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleVerDniPublico(interaction) {
  const target = interaction.options.getMember('usuario');
  const pj = interaction.options.getString('pj');
  const userData = getUserData(interaction.guild.id, target.id);
  const dni = userData.pjs[pj].dni;

  if (!dni) {
    return interaction.reply({ content: `❌ **${target}** no tiene DNI en el PJ${pj}.`, flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🔍 DNI DE ${target.user.tag} - PJ${pj}`)
    .setColor(0x00AAFF)
    .setThumbnail(target.user.displayAvatarURL())
    .addFields(
      { name: '🪪 DNI', value: dni.numero, inline: true },
      { name: 'Nombre Completo', value: `${dni.nombre} ${dni.apellido}`, inline: true },
      { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
      { name: 'Nacionalidad', value: dni.nacionalidad, inline: true },
      { name: 'Género', value: dni.genero, inline: true },
      { name: 'Creado', value: dni.fechaCreacion, inline: true }
    );

  await interaction.reply({ embeds: [embed] });
}

async function handleMulta(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía puede multar.', flags: MessageFlags.Ephemeral });
  }

  const miembro = interaction.options.getMember('usuario');
  const cantidad = interaction.options.getInteger('cantidad');
  const razon = interaction.options.getString('razon');
  const guildId = interaction.guild.id;

  if (!sanciones[guildId]) sanciones[guildId] = [];
  const sanctionId = sanciones[guildId].length + 1;

  const registro = {
    id: sanctionId,
    user_id: miembro.id,
    user_name: miembro.user.tag,
    mod_id: interaction.user.id,
    mod_name: interaction.user.tag,
    tipo: '💰 Multa',
    razon: `${razon} | Cantidad: $${cantidad.toLocaleString('es-ES')}`,
    timestamp: new Date().toISOString()
  };
  sanciones[guildId].push(registro);
  guardarSanciones();

  const userData = getUserData(guildId, miembro.id);
  userData.dinero -= cantidad;
  if (userData.dinero < 0) userData.dinero = 0;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💰 MULTA REGISTRADA')
    .setColor(0xFFAA00)
    .addFields(
      { name: 'Usuario', value: `${miembro}`, inline: false },
      { name: 'Cantidad', value: `**$${cantidad.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Nuevo balance', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true },
      { name: 'Razón', value: razon, inline: false }
    )
    .setFooter({ text: `Multa ID: ${sanctionId}` });

  await interaction.reply({ embeds: [embed] });
  try { await miembro.send({ embeds: [embed] }); } catch {}
}

async function handleArrestar(interaction) {
  if (!POLICE_ROLES.some(roleId => interaction.member.roles.cache.has(roleId))) {
    return interaction.reply({ content: '❌ Solo Policía puede arrestar.', flags: MessageFlags.Ephemeral });
  }
  const modal = new ModalBuilder()
    .setCustomId('modal-arrestar')
    .setTitle('🚔 Formulario de Arresto');
  modal.addComponents(
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nombre_ic').setLabel('Nombre IC (arrestado)').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('articulos').setLabel('Artículos').setStyle(TextInputStyle.Paragraph).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('policias').setLabel('Policías').setStyle(TextInputStyle.Short).setRequired(true)),
    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('tiempo').setLabel('Tiempo en cárcel').setStyle(TextInputStyle.Short).setRequired(true))
  );
  await interaction.showModal(modal);
}

// ======================
// SANCIONES (completo y extendido)
// ======================
async function handleSancionar(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
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
      { name: 'Usuario', value: `${miembro}`, inline: false },
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
    .addFields(
      { name: 'Tipo', value: tipo },
      { name: 'Razón', value: razon },
      { name: 'Moderador', value: interaction.user.tag }
    );
  try { await miembro.send({ embeds: [embedDM] }); } catch {}
}

async function handleVerSanciones(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
  const guildId = interaction.guild.id;
  const lista = sanciones[guildId] || [];
  if (lista.length === 0) return interaction.reply({ content: '📭 No hay sanciones registradas.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle(`📋 Todas las sanciones del servidor (${lista.length})`)
    .setColor(0xFFA500);

  lista.slice(-15).reverse().forEach(s => {
    embed.addFields({
      name: `ID: ${s.id} | ${s.user_name} • ${s.tipo}`,
      value: `**Razón:** ${s.razon}\n**Moderador:** ${s.mod_name}\n**Fecha:** <t:${Math.floor(new Date(s.timestamp).getTime() / 1000)}:R>`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleVerSancionesUsuario(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
  const miembro = interaction.options.getMember('usuario');
  const guildId = interaction.guild.id;
  const lista = sanciones[guildId] || [];
  const usuarioSanciones = lista.filter(s => s.user_id === miembro.id);

  if (usuarioSanciones.length === 0) {
    return interaction.reply({ content: `📭 **${miembro}** no tiene sanciones.`, flags: MessageFlags.Ephemeral });
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

async function handleEliminarSancion(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', flags: MessageFlags.Ephemeral });
  }
  const sanctionId = interaction.options.getInteger('id');
  const guildId = interaction.guild.id;
  const lista = sanciones[guildId] || [];
  const indice = lista.findIndex(s => s.id === sanctionId);

  if (indice === -1) {
    return interaction.reply({ content: `❌ No existe la sanción con ID \`${sanctionId}\`.`, flags: MessageFlags.Ephemeral });
  }

  const usuario = lista[indice].user_name;
  lista.splice(indice, 1);
  sanciones[guildId] = lista;
  guardarSanciones();

  await interaction.reply(`✅ **Sanción ID ${sanctionId}** de **${usuario}** eliminada.`);
}

// ======================
// ANUNCIOS + ESTADO + ECONOMÍA
// ======================

async function handleAnuncioRp(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ Solo Staff puede crear anuncios.', flags: MessageFlags.Ephemeral });
  }
  const titulo = interaction.options.getString('titulo');
  const descripcion = interaction.options.getString('descripcion');
  let colorHex = interaction.options.getString('color') || '#00FFAA';
  const color = parseInt(colorHex.replace('#', ''), 16);

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descripcion)
    .setColor(color)
    .setTimestamp()
    .setFooter({ text: `Anuncio RP • ${interaction.guild.name}` });

  await interaction.reply({ embeds: [embed] });
}

async function handleEstadoServer(interaction) {
  const estado = serverAbierto ? '🟢 **ABIERTO**' : '🔴 **CERRADO**';
  let texto = `**Estado actual:** ${estado}\n`;
  if (serverAbierto && ultimaApertura) {
    texto += `**Abierto desde:** <t:${Math.floor(ultimaApertura / 1000)}:R>\n`;
  }
  let votacionActiva = 'No hay votación activa.';
  for (const [_, poll] of votes.entries()) {
    if (poll.channel.id === interaction.channel.id) {
      votacionActiva = `✅ **Votación activa** (${poll.yes + poll.later + poll.no} votos)`;
      break;
    }
  }
  texto += `\n${votacionActiva}`;

  const embed = new EmbedBuilder()
    .setTitle('📡 ESTADO DEL SERVIDOR RP')
    .setDescription(texto)
    .setColor(serverAbierto ? 0x00FF00 : 0xFF0000)
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

// ======================
// ECONOMÍA COMPLETA
// ======================

async function handleBalance(interaction) {
  const target = interaction.options.getMember('usuario') || interaction.member;
  const userData = getUserData(interaction.guild.id, target.id);
  const embed = new EmbedBuilder()
    .setTitle(`💰 Balance de ${target.user.tag}`)
    .setColor(0x00FFAA)
    .addFields({ name: 'Dinero actual', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: false })
    .setThumbnail(target.user.displayAvatarURL());
  await interaction.reply({ embeds: [embed] });
}

async function handleAddMoney(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden usar este comando.', flags: MessageFlags.Ephemeral });
  }
  const target = interaction.options.getMember('usuario');
  const cantidad = interaction.options.getInteger('cantidad');
  const userData = getUserData(interaction.guild.id, target.id);
  userData.dinero += cantidad;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💰 Dinero modificado')
    .setColor(cantidad >= 0 ? 0x00FF88 : 0xFF0000)
    .addFields(
      { name: 'Usuario', value: `${target}`, inline: false },
      { name: 'Cantidad', value: `${cantidad >= 0 ? '+' : ''}$${cantidad.toLocaleString('es-ES')}`, inline: true },
      { name: 'Nuevo balance', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handleSueldo(interaction) {
  await interaction.deferReply();
  const userData = getUserData(interaction.guild.id, interaction.user.id);
  const member = interaction.member;
  const ahora = Date.now();

  if (userData.lastSalary && ahora - userData.lastSalary < 86400000) {
    const tiempoRestante = Math.ceil((86400000 - (ahora - userData.lastSalary)) / 3600000);
    return interaction.editReply(`⏳ Ya cobraste tu sueldo. Próximo cobro en **${tiempoRestante} horas**.`);
  }

  let bonus = 0;
  for (const [roleId, amount] of Object.entries(ROLE_BONUSES)) {
    if (member.roles.cache.has(roleId)) bonus += amount;
  }
  const totalSueldo = SALARY_BASE + bonus;
  userData.dinero += totalSueldo;
  userData.lastSalary = ahora;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💼 ¡Sueldo cobrado!')
    .setColor(0x00FFAA)
    .addFields(
      { name: 'Sueldo base', value: `**$${SALARY_BASE}**`, inline: true },
      { name: 'Bonus por roles', value: `**+$${bonus}**`, inline: true },
      { name: 'Total recibido', value: `**$${totalSueldo.toLocaleString('es-ES')}**`, inline: false },
      { name: 'Nuevo balance', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: false }
    );
  await interaction.editReply({ embeds: [embed] });
}

async function handleTransferir(interaction) {
  const target = interaction.options.getMember('usuario');
  const cantidad = interaction.options.getInteger('cantidad');

  if (cantidad < 100) return interaction.reply({ content: '❌ La cantidad mínima es 100 $.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  const targetData = getUserData(interaction.guild.id, target.id);

  if (userData.dinero < cantidad) return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });

  userData.dinero -= cantidad;
  targetData.dinero += cantidad;
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('💸 Transferencia realizada')
    .setColor(0x00AAFF)
    .addFields(
      { name: 'De', value: interaction.user.toString(), inline: true },
      { name: 'Para', value: target.toString(), inline: true },
      { name: 'Cantidad', value: `**$${cantidad.toLocaleString('es-ES')}**`, inline: false }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handleApostar(interaction) {
  const cantidad = interaction.options.getInteger('cantidad');
  const opcion = interaction.options.getString('opcion');

  if (cantidad < 100) return interaction.reply({ content: '❌ La apuesta mínima es 100 $.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < cantidad) return interaction.reply({ content: '❌ No tienes suficiente dinero.', flags: MessageFlags.Ephemeral });

  const gana = Math.random() < 0.5;
  if (gana) {
    const ganancia = cantidad * 2;
    userData.dinero += ganancia - cantidad;
    guardarIdentidades();
    const embedWin = new EmbedBuilder()
      .setTitle('🎉 ¡GANASTE!')
      .setColor(0x00FF00)
      .setDescription(`**${opcion.toUpperCase()}** salió!`)
      .addFields({ name: 'Ganancia', value: `**+$${cantidad.toLocaleString('es-ES')}**` });
    await interaction.reply({ embeds: [embedWin] });
  } else {
    userData.dinero -= cantidad;
    guardarIdentidades();
    const embedLose = new EmbedBuilder()
      .setTitle('😢 Perdiste')
      .setColor(0xFF0000)
      .setDescription(`Salió **${opcion === 'cara' ? 'CRUZ' : 'CARA'}**...`)
      .addFields({ name: 'Perdiste', value: `**-$${cantidad.toLocaleString('es-ES')}**` });
    await interaction.reply({ embeds: [embedLose] });
  }
}

async function handleLeaderboard(interaction) {
  await interaction.deferReply();
  const guildData = identidades[interaction.guild.id] || {};
  const ranking = Object.entries(guildData)
    .map(([userId, data]) => ({ userId, dinero: data.dinero ?? 0 }))
    .filter(u => u.dinero > 0)
    .sort((a, b) => b.dinero - a.dinero)
    .slice(0, 10);

  if (ranking.length === 0) return interaction.editReply('📭 Todavía no hay nadie con dinero.');

  const embed = new EmbedBuilder()
    .setTitle('🏆 TABLA DE CLASIFICACIÓN - MÁS RICOS')
    .setColor(0xFFD700)
    .setTimestamp();

  ranking.forEach((entry, i) => {
    const member = interaction.guild.members.cache.get(entry.userId);
    const name = member ? member.user.tag : `ID: ${entry.userId}`;
    const medalla = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `**#${i+1}**`;
    embed.addFields({ name: `${medalla} ${name}`, value: `**$${entry.dinero.toLocaleString('es-ES')}**`, inline: false });
  });

  await interaction.editReply({ embeds: [embed] });
}

// ======================
// TIENDA COMPLETA
// ======================

async function handleAgregarProducto(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores pueden añadir productos.', flags: MessageFlags.Ephemeral });
  }
  const nombre = interaction.options.getString('nombre');
  const precio = interaction.options.getInteger('precio');
  const descripcion = interaction.options.getString('descripcion');
  const stockInput = interaction.options.getInteger('stock');
  const stock = (stockInput === 0 || stockInput === null) ? null : stockInput;
  const emoji = interaction.options.getString('emoji') || '📦';

  const guildTienda = getGuildTienda(interaction.guild.id);
  guildTienda.push({
    id: Date.now().toString(),
    nombre,
    precio,
    descripcion,
    stock,
    emoji
  });
  guardarTienda();

  await interaction.reply({ content: `✅ **${nombre}** añadido correctamente.\nStock: ${stock === null ? '∞ (Ilimitado)' : stock}`, flags: MessageFlags.Ephemeral });
}

async function handleBorrarProducto(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }
  const id = interaction.options.getString('id');
  const guildTienda = getGuildTienda(interaction.guild.id);
  const index = guildTienda.findIndex(p => p.id === id);
  if (index === -1) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });

  const nombre = guildTienda[index].nombre;
  guildTienda.splice(index, 1);
  guardarTienda();
  await interaction.reply({ content: `🗑️ Producto **${nombre}** eliminado de la tienda.`, flags: MessageFlags.Ephemeral });
}

async function handleActualizarStock(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }
  const id = interaction.options.getString('id');
  const nuevoStockInput = interaction.options.getInteger('nuevo_stock');
  const nuevoStock = nuevoStockInput === 0 ? null : nuevoStockInput;

  const guildTienda = getGuildTienda(interaction.guild.id);
  const producto = guildTienda.find(p => p.id === id);
  if (!producto) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });

  producto.stock = nuevoStock;
  guardarTienda();
  await interaction.reply({ content: `✅ Stock de **${producto.nombre}** actualizado a **${nuevoStock === null ? '∞' : nuevoStock}**.`, flags: MessageFlags.Ephemeral });
}

async function handleVerTienda(interaction) {
  const guildTienda = getGuildTienda(interaction.guild.id);
  if (guildTienda.length === 0) return interaction.reply({ content: '🛒 La tienda está vacía.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle('🛒 Tienda Albacete RP')
    .setColor(0x00FFAA);

  guildTienda.forEach(p => {
    const stockText = p.stock === null ? '∞ (Ilimitado)' : p.stock;
    embed.addFields({
      name: `${p.emoji} ${p.nombre}`,
      value: `**Precio:** $${p.precio}\n**Stock:** ${stockText}\n${p.descripcion}`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed] });
}

async function handleComprar(interaction) {
  const id = interaction.options.getString('id');
  const guildTienda = getGuildTienda(interaction.guild.id);
  const producto = guildTienda.find(p => p.id === id);
  if (!producto) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });
  if (producto.stock !== null && producto.stock <= 0) return interaction.reply({ content: '❌ Este producto está agotado.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < producto.precio) {
    return interaction.reply({ content: `❌ No tienes suficiente dinero. Necesitas **$${producto.precio}**.`, flags: MessageFlags.Ephemeral });
  }

  userData.dinero -= producto.precio;
  if (producto.stock !== null) producto.stock--;
  userData.purchases.push({
    nombre: producto.nombre,
    precio: producto.precio,
    fecha: new Date().toLocaleString('es-ES')
  });
  guardarTienda();
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('✅ Compra Exitosa')
    .setDescription(`Has comprado **${producto.nombre}**`)
    .setColor(0x00FF88)
    .addFields(
      { name: 'Precio', value: `**$${producto.precio}**`, inline: true },
      { name: 'Balance actual', value: `**$${userData.dinero.toLocaleString('es-ES')}**`, inline: true }
    );
  await interaction.reply({ embeds: [embed] });
}

async function handlePanelTienda(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }
  const guildTienda = getGuildTienda(interaction.guild.id);
  if (guildTienda.length === 0) return interaction.reply({ content: 'No hay productos en la tienda.', flags: MessageFlags.Ephemeral });

  const embed = new EmbedBuilder()
    .setTitle('🛒 TIENDA OFICIAL ALBACETE RP')
    .setColor(0x00FFAA)
    .setDescription('Selecciona el producto que deseas comprar:');

  const select = new StringSelectMenuBuilder()
    .setCustomId('tienda-select')
    .setPlaceholder('Elige un producto...')
    .addOptions(guildTienda.map(p => {
      const stockText = p.stock === null ? '∞' : p.stock;
      return new StringSelectMenuOptionBuilder()
        .setLabel(p.nombre)
        .setDescription(`$${p.precio} | Stock: ${stockText}`)
        .setValue(p.id)
        .setEmoji(p.emoji);
    }));

  const row = new ActionRowBuilder().addComponents(select);
  await interaction.channel.send({ embeds: [embed], components: [row] });
  await interaction.reply({ content: '✅ Panel de tienda creado.', flags: MessageFlags.Ephemeral });
}

async function handleTiendaSelect(interaction) {
  const guildTienda = getGuildTienda(interaction.guild.id);
  const producto = guildTienda.find(p => p.id === interaction.values[0]);
  if (!producto) return interaction.reply({ content: '❌ Producto no encontrado.', flags: MessageFlags.Ephemeral });
  if (producto.stock !== null && producto.stock <= 0) return interaction.reply({ content: '❌ Este producto está agotado.', flags: MessageFlags.Ephemeral });

  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.dinero < producto.precio) {
    return interaction.reply({ content: `❌ No tienes suficiente dinero.`, flags: MessageFlags.Ephemeral });
  }

  userData.dinero -= producto.precio;
  if (producto.stock !== null) producto.stock--;
  userData.purchases.push({
    nombre: producto.nombre,
    precio: producto.precio,
    fecha: new Date().toLocaleString('es-ES')
  });
  guardarTienda();
  guardarIdentidades();

  const embed = new EmbedBuilder()
    .setTitle('✅ ¡Compra realizada!')
    .setDescription(`Has comprado **${producto.nombre}** por **$${producto.precio}**`)
    .setColor(0x00FF88)
    .addFields({ name: 'Balance restante', value: `**$${userData.dinero.toLocaleString('es-ES')}**` });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleInventario(interaction) {
  const userData = getUserData(interaction.guild.id, interaction.user.id);
  if (userData.purchases.length === 0) {
    return interaction.reply({ content: '🎒 Aún no has comprado nada en la tienda.', flags: MessageFlags.Ephemeral });
  }

  const embed = new EmbedBuilder()
    .setTitle(`🎒 Tu Inventario - ${interaction.user.tag}`)
    .setColor(0xFFD700);

  userData.purchases.forEach((p, i) => {
    embed.addFields({
      name: `#${i + 1} ${p.nombre}`,
      value: `**$${p.precio}** • ${p.fecha}`,
      inline: false
    });
  });

  await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleClearTienda(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo administradores.', flags: MessageFlags.Ephemeral });
  }
  const guildTienda = getGuildTienda(interaction.guild.id);
  const cantidad = guildTienda.length;
  guildTienda.length = 0;
  guardarTienda();
  await interaction.reply({ content: `🗑️ Se han eliminado **${cantidad}** productos de la tienda.` });
}

// ======================
// LOGIN DEL BOT + CIERRE
// ======================

client.login(process.env.TOKEN)
  .then(() => {
    console.log(`🚀 Bot Albacete RP conectado correctamente como ${client.user.tag}`);
    console.log('✅ Todos los sistemas cargados: Votaciones, DNI, Tienda, Economía, Sanciones y Policía.');
  })
  .catch(err => {
    console.error('❌ Error al iniciar sesión con el TOKEN:', err);
    console.error('🔧 Revisa que el TOKEN esté correcto en el archivo .env');
  });

// ======================
// MANTENER EL PROCESO VIVO (Render / Hosting)
// ======================
process.on('unhandledRejection', error => {
  console.error('❌ Error no manejado:', error);
});

console.log('🌍 Bot de Gestión ALBACETE RP iniciado y listo para funcionar.');
