// ======================
// 1. CARGAR VARIABLES DE ENTORNO (.env)
// ======================
require('dotenv').config();

// ======================
// 2. SERVIDOR HTTP PARA RENDER
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
// 3. BOT DE DISCORD.JS
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
  TextInputStyle
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
// CANALES PARA VER DOCUMENTOS
// ======================
const DNI_CHANNEL_ID = '1466563810784444478';
const CARNET_CHANNEL_ID = '1457570708497371332';
const LICENCIA_CHANNEL_ID = '1493631768169939136';

// ======================
// 4. SISTEMA DE SANCIONES
// ======================
const SANCTIONS_FILE = path.join(__dirname, 'sanciones.json');
let sanciones = {};

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
    console.log('ℹ️ Archivo sanciones.json creado.');
  }
}

function guardarSanciones() {
  try {
    fs.writeFileSync(SANCTIONS_FILE, JSON.stringify(sanciones, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar sanciones:', error);
  }
}

// ======================
// 5. SISTEMA DE VOTACIONES
// ======================
const votes = new Map();

function createProgressBar(votosQueCuentan, maximo = 5) {
  const porcentaje = Math.min(Math.round((votosQueCuentan / maximo) * 100), 100);
  const segmentos = Math.round(10 * (votosQueCuentan / maximo));
  const barra = '█'.repeat(segmentos) + '░'.repeat(10 - segmentos);
  if (votosQueCuentan >= maximo) return `✅ **COMPLETADO** (${porcentaje}%)`;
  return `${barra} **${porcentaje}%**`;
}

// ======================
// 6. SISTEMA DE DNI / CARNET / LICENCIA
// ======================
const IDENTIDADES_FILE = path.join(__dirname, 'identidades.json');
let identidades = {};

function cargarIdentidades() {
  if (fs.existsSync(IDENTIDADES_FILE)) {
    try {
      identidades = JSON.parse(fs.readFileSync(IDENTIDADES_FILE, 'utf-8'));
      console.log('✅ Identidades (DNI) cargadas correctamente.');
    } catch (error) {
      console.error('❌ Error al cargar identidades:', error);
      identidades = {};
    }
  } else {
    identidades = {};
    console.log('ℹ️ Archivo identidades.json creado.');
  }
}

function guardarIdentidades() {
  try {
    fs.writeFileSync(IDENTIDADES_FILE, JSON.stringify(identidades, null, 4), 'utf-8');
  } catch (error) {
    console.error('❌ Error al guardar identidades:', error);
  }
}

function getUserData(guildId, userId) {
  if (!identidades[guildId]) identidades[guildId] = {};
  if (!identidades[guildId][userId]) {
    identidades[guildId][userId] = {
      pjs: {
        "1": { dni: null, carnetConducir: null, licenciaArmas: null },
        "2": { dni: null, carnetConducir: null, licenciaArmas: null }
      }
    };
  }
  return identidades[guildId][userId];
}

// ======================
// 7. EVENTO READY
// ======================
client.once(Events.ClientReady, async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);
  cargarSanciones();
  cargarIdentidades();

  const commands = [
    // VOTACIONES
    new SlashCommandBuilder().setName('votacion').setDescription('Crea votación de apertura de servidor (30 minutos)'),
    new SlashCommandBuilder().setName('abrirserver').setDescription('Abre el servidor manualmente'),
    new SlashCommandBuilder().setName('cerrarserver').setDescription('Cierra el servidor'),
    new SlashCommandBuilder().setName('cancelarvotacion').setDescription('Cancela la votación activa en este canal'),

    // SANCIONES
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

    new SlashCommandBuilder().setName('sanciones').setDescription('Ver todas las sanciones del servidor'),
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

    // PANEL DNI
    new SlashCommandBuilder().setName('panel-dni').setDescription('Crea el panel oficial del sistema de DNI')
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
// 8. INTERACCIONES
// ======================
client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isChatInputCommand()) {
    switch (interaction.commandName) {
      case 'votacion': await handleVotacion(interaction); break;
      case 'abrirserver': await handleAbrirServer(interaction); break;
      case 'cerrarserver': await handleCerrarServer(interaction); break;
      case 'cancelarvotacion': await handleCancelarVotacion(interaction); break;
      case 'sancionar': await handleSancionar(interaction); break;
      case 'sanciones': await handleVerSanciones(interaction); break;
      case 'sanciones_usuario': await handleVerSancionesUsuario(interaction); break;
      case 'eliminarsancion': await handleEliminarSancion(interaction); break;
      case 'limpiarsanciones': await handleLimpiarSanciones(interaction); break;
      case 'panel-dni': await handlePanelDni(interaction); break;
    }
  }

  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (customId.startsWith('dni-') || customId.startsWith('carnet-') || customId.startsWith('licencia-')) {
      await handleDniButton(interaction);
    } else {
      await handleButtonVote(interaction);
    }
  }

  if (interaction.isModalSubmit()) {
    await handleModalSubmit(interaction);
  }
});

// ======================
// 9. FUNCIONES DE SANCIONES
// ======================
async function handleSancionar(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', ephemeral: true });
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

async function handleVerSanciones(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', ephemeral: true });
  }
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

async function handleVerSancionesUsuario(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', ephemeral: true });
  }
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

async function handleEliminarSancion(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', ephemeral: true });
  }
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

async function handleLimpiarSanciones(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
    return interaction.reply({ content: '❌ No tienes permisos suficientes.', ephemeral: true });
  }
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

// ======================
// FUNCIONES DE VOTACIÓN
// ======================
async function handleVotacion(interaction) {
  await interaction.deferReply();
  const embed = new EmbedBuilder()
    .setTitle('VOTACIÓN DE APERTURA DE SERVIDOR')
    .setDescription('**¿Te unirás a la apertura del servidor?**\nVota con los botones de abajo.\n\n⏰ La votación dura **30 minutos**.\nAl llegar a **5 votos "Me uniré"** se abrirá automáticamente.')
    .setColor(0x5865F2)
    .addFields(
      { name: '✅ Me uniré', value: '0', inline: true },
      { name: '⏰ Me uniré más tarde', value: '0', inline: true },
      { name: '❌ No me uniré', value: '0', inline: true },
      { name: '📊 Progreso', value: createProgressBar(0), inline: false }
    )
    .setTimestamp();
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰'),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );
  const mensaje = await interaction.editReply({
    content: '@everyone',
    embeds: [embed],
    components: [row]
  });
  const pollData = {
    yes: 0,
    later: 0,
    no: 0,
    voters: new Map(),
    message: mensaje,
    channel: interaction.channel,
    creatorId: interaction.user.id,
    timeout: null
  };
  votes.set(mensaje.id, pollData);
  pollData.timeout = setTimeout(() => {
    cerrarVotacionPorTiempo(mensaje.id);
  }, 30 * 60 * 1000);
}

async function handleCancelarVotacion(interaction) {
  await interaction.deferReply({ ephemeral: true });
  let pollData = null;
  let messageIdToCancel = null;
  for (const [msgId, data] of votes.entries()) {
    if (data.channel.id === interaction.channel.id) {
      pollData = data;
      messageIdToCancel = msgId;
      break;
    }
  }
  if (!pollData) {
    return interaction.editReply({ content: '❌ No hay ninguna votación activa en este canal.' });
  }
  const isCreator = pollData.creatorId === interaction.user.id;
  const isAdmin = interaction.member.permissions.has(PermissionsBitField.Flags.Administrator);
  if (!isCreator && !isAdmin) {
    return interaction.editReply({ content: '❌ Solo la persona que creó la votación o un Administrador puede cancelarla.' });
  }
  if (pollData.timeout) clearTimeout(pollData.timeout);
  try {
    const cancelEmbed = EmbedBuilder.from(pollData.message.embeds[0])
      .setDescription('**❌ Votación cancelada manualmente**\nLa votación ha sido cancelada.')
      .setColor(0xFF0000);
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true),
      new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰').setDisabled(true),
      new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
    );
    await pollData.message.edit({
      embeds: [cancelEmbed],
      components: [disabledRow]
    });
    await interaction.editReply({ content: '✅ Votación cancelada correctamente.' });
    await pollData.channel.send('❌ **La votación ha sido cancelada manualmente.**');
  } catch (error) {
    console.error('Error al cancelar la votación:', error);
    await interaction.editReply({ content: '❌ Ocurrió un error al cancelar la votación.' });
  }
  votes.delete(messageIdToCancel);
}

async function handleButtonVote(interaction) {
  const pollData = votes.get(interaction.message.id);
  if (!pollData) {
    return interaction.reply({ content: '❌ Esta votación ya expiró o fue cancelada.', ephemeral: true });
  }
  const customId = interaction.customId;
  const opcion = customId === 'vote_yes' ? 'yes' : customId === 'vote_later' ? 'later' : 'no';
  const userId = interaction.user.id;
  const votoAnterior = pollData.voters.get(userId);
  if (votoAnterior === opcion) {
    return interaction.reply({ content: '✅ Ya habías votado esta opción.', ephemeral: true });
  }
  if (votoAnterior) pollData[votoAnterior]--;
  pollData[opcion]++;
  pollData.voters.set(userId, opcion);
  const votosQueCuentan = pollData.yes + pollData.later;
  const nuevaBarra = createProgressBar(votosQueCuentan);
  const nuevoEmbed = EmbedBuilder.from(interaction.message.embeds[0])
    .setFields(
      { name: '✅ Me uniré', value: pollData.yes.toString(), inline: true },
      { name: '⏰ Me uniré más tarde', value: pollData.later.toString(), inline: true },
      { name: '❌ No me uniré', value: pollData.no.toString(), inline: true },
      { name: '📊 Progreso', value: nuevaBarra, inline: false }
    );
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰'),
    new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌')
  );
  if (pollData.yes >= 5) {
    row.components.forEach(btn => btn.setDisabled(true));
    await interaction.update({ embeds: [nuevoEmbed], components: [row] });
    if (pollData.timeout) clearTimeout(pollData.timeout);
    await abrirServidorAutomatico(interaction.channel, pollData);
    votes.delete(interaction.message.id);
    return;
  }
  await interaction.update({ embeds: [nuevoEmbed], components: [row] });
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
  let menciones = '';
  if (pollData) {
    pollData.voters.forEach((opcion, userId) => {
      if (opcion === 'yes') menciones += `<@${userId}> `;
    });
    if (pollData.timeout) clearTimeout(pollData.timeout);
    votes.delete(messageIdToRemove);
  }
  if (!menciones) menciones = '*No hay confirmados aún.*';
  const embed = new EmbedBuilder()
    .setTitle('🔓 ¡EL SERVIDOR ESTÁ ABIERTO!')
    .setDescription('**¡Atención!**\nTienen **10 minutos** para unirse al servidor.\n\n¡Que lo pasen genial!')
    .setColor(0x00FF00)
    .setImage('https://media.tenor.com/5zqWqWvJ0zUAAAAC/server-open.gif')
    .setTimestamp();
  await interaction.editReply({
    content: `@everyone\n\n**Ping a los confirmados:**\n${menciones}`,
    embeds: [embed]
  });
}

async function abrirServidorAutomatico(channel, pollData) {
  let menciones = '';
  pollData.voters.forEach((opcion, userId) => {
    if (opcion === 'yes') menciones += `<@${userId}> `;
  });
  const embed = new EmbedBuilder()
    .setTitle('🔓 ¡EL SERVIDOR SE HA ABIERTO AUTOMÁTICAMENTE!')
    .setDescription('Se alcanzó el mínimo de **5 votos "Me uniré"**.\n\nTienen **10 minutos** para unirse.\n\n¡Diviértanse!')
    .setColor(0x00FF00)
    .setImage('https://media.tenor.com/5zqWqWvJ0zUAAAAC/server-open.gif')
    .setTimestamp();
  await channel.send({
    content: `@everyone\n\n**Ping a los confirmados:**\n${menciones || '*No hay confirmados.*'}`,
    embeds: [embed]
  });
}

async function handleCerrarServer(interaction) {
  await interaction.deferReply();
  const embed = new EmbedBuilder()
    .setTitle('🔒 SERVIDOR CERRADO')
    .setDescription('**¡Gracias por unirse!**\n\nAgradecemos a todos los que participaron.\n\n¡Hasta la próxima!')
    .setColor(0xFF0000)
    .setImage('https://media.tenor.com/3f2zq2zq2QAAAAC/closed-server.gif')
    .setTimestamp();
  await interaction.editReply({ content: '@everyone', embeds: [embed] });
}

async function cerrarVotacionPorTiempo(messageId) {
  const pollData = votes.get(messageId);
  if (!pollData) return;
  try {
    const nuevoEmbed = EmbedBuilder.from(pollData.message.embeds[0])
      .setDescription('**⏰ Votación expirada**\nLa votación ha durado 30 minutos y se ha cerrado automáticamente.')
      .setColor(0xFF9900);
    const disabledRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('vote_yes').setLabel('Me uniré').setStyle(ButtonStyle.Success).setEmoji('✅').setDisabled(true),
      new ButtonBuilder().setCustomId('vote_later').setLabel('Me uniré más tarde').setStyle(ButtonStyle.Primary).setEmoji('⏰').setDisabled(true),
      new ButtonBuilder().setCustomId('vote_no').setLabel('No me uniré').setStyle(ButtonStyle.Danger).setEmoji('❌').setDisabled(true)
    );
    await pollData.message.edit({
      embeds: [nuevoEmbed],
      components: [disabledRow]
    });
    await pollData.channel.send('⏰ **La votación ha expirado** después de 30 minutos.');
  } catch (e) {
    console.error('Error al cerrar votación por tiempo:', e);
  }
  votes.delete(messageId);
}

// ======================
// 10. PANEL DNI
// ======================
async function handlePanelDni(interaction) {
  if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
    return interaction.reply({ content: '❌ Solo los administradores pueden crear el panel de DNI.', ephemeral: true });
  }
  await interaction.deferReply({ ephemeral: true });

  const embed = new EmbedBuilder()
    .setTitle('🪪 SISTEMA OFICIAL DE DNI - RP')
    .setDescription('**Cada jugador puede tener hasta 2 personajes (PJ1 y PJ2).**\n\n' +
      '• Crea tu DNI con tus datos reales del personaje.\n' +
      '• Con el DNI podrás sacar **Carnet de Conducir** y **Licencia de Armas**.\n' +
      '• Solo tú puedes gestionar tus documentos.\n' +
      '• Los administradores pueden borrar documentos si es necesario.\n\n' +
      'Usa los botones de abajo:')
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

// ======================
// 11. BOTONES DEL SISTEMA DNI
// ======================
async function handleDniButton(interaction) {
  const customId = interaction.customId;
  let modal;

  if (customId === 'dni-crear') {
    modal = new ModalBuilder()
      .setCustomId('modal-dni-crear')
      .setTitle('🪪 Crear DNI');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('PJ (1 o 2)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nombre').setLabel('Nombre').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('apellido').setLabel('Apellido').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('fechaNac').setLabel('Fecha Nacimiento (DD/MM/AAAA)').setStyle(TextInputStyle.Short).setRequired(true)),
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nacionalidadGenero').setLabel('Nacionalidad y Género (ej: Argentina - Masculino)').setStyle(TextInputStyle.Short).setRequired(true))
    );
    await interaction.showModal(modal);
  }
  else if (customId === 'dni-ver' || customId === 'dni-borrar') {
    modal = new ModalBuilder()
      .setCustomId(customId === 'dni-ver' ? 'modal-dni-ver' : 'modal-dni-borrar')
      .setTitle(customId === 'dni-ver' ? '🔎 Ver DNI' : '🗑️ Borrar DNI');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('PJ (1 o 2)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1))
    );
    await interaction.showModal(modal);
  }
  else if (customId === 'carnet-crear' || customId === 'carnet-ver' || customId === 'carnet-borrar') {
    const action = customId.split('-')[1];
    modal = new ModalBuilder()
      .setCustomId(`modal-carnet-${action}`)
      .setTitle(action === 'crear' ? '🚗 Crear Carnet de Conducir' : action === 'ver' ? '🔎 Ver Carnet' : '🗑️ Borrar Carnet');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('PJ (1 o 2)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1))
    );
    await interaction.showModal(modal);
  }
  else if (customId === 'licencia-crear' || customId === 'licencia-ver' || customId === 'licencia-borrar') {
    const action = customId.split('-')[1];
    modal = new ModalBuilder()
      .setCustomId(`modal-licencia-${action}`)
      .setTitle(action === 'crear' ? '🔫 Crear Licencia de Armas' : action === 'ver' ? '🔎 Ver Licencia' : '🗑️ Borrar Licencia');
    modal.addComponents(
      new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pj').setLabel('PJ (1 o 2)').setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(1))
    );
    await interaction.showModal(modal);
  }
}

// ======================
// 12. MODALES DEL SISTEMA DNI
// ======================
async function handleModalSubmit(interaction) {
  const customId = interaction.customId;
  const guildId = interaction.guild.id;
  const userId = interaction.user.id;
  const userData = getUserData(guildId, userId);

  // ==================== CREAR DNI ====================
  if (customId === 'modal-dni-crear') {
    const pj = interaction.fields.getTextInputValue('pj');
    const nombre = interaction.fields.getTextInputValue('nombre');
    const apellido = interaction.fields.getTextInputValue('apellido');
    const fechaNac = interaction.fields.getTextInputValue('fechaNac');
    const nacionalidadGenero = interaction.fields.getTextInputValue('nacionalidadGenero');

    if (pj !== '1' && pj !== '2') {
      return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', ephemeral: true });
    }
    if (userData.pjs[pj].dni) {
      return interaction.reply({ content: `❌ Ya tienes un DNI creado para el PJ${pj}.`, ephemeral: true });
    }

    const dniNumero = Math.floor(10000000 + Math.random() * 90000000).toString();
    const fechaCreacion = new Date().toLocaleDateString('es-ES');

    userData.pjs[pj].dni = {
      numero: dniNumero,
      nombre,
      apellido,
      fechaNac,
      nacionalidadGenero,
      fechaCreacion
    };

    guardarIdentidades();

    const embed = new EmbedBuilder()
      .setTitle(`✅ DNI Creado - PJ${pj}`)
      .setColor(0x00FFAA)
      .addFields(
        { name: 'DNI', value: dniNumero, inline: true },
        { name: 'Nombre', value: `${nombre} ${apellido}`, inline: true },
        { name: 'Fecha Nacimiento', value: fechaNac, inline: true },
        { name: 'Nacionalidad / Género', value: nacionalidadGenero, inline: false },
        { name: 'Creado', value: fechaCreacion, inline: true }
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }

  // ==================== VER / BORRAR DNI ====================
  else if (customId === 'modal-dni-ver' || customId === 'modal-dni-borrar') {
    const pj = interaction.fields.getTextInputValue('pj');
    if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', ephemeral: true });

    const dni = userData.pjs[pj].dni;
    if (!dni) return interaction.reply({ content: `❌ No tienes DNI en el PJ${pj}.`, ephemeral: true });

    if (customId === 'modal-dni-ver') {
      const embed = new EmbedBuilder()
        .setTitle(`🔎 DNI OFICIAL - PJ${pj}`)
        .setColor(0x00AAFF)
        .addFields(
          { name: 'DNI', value: dni.numero, inline: true },
          { name: 'Nombre', value: `${dni.nombre} ${dni.apellido}`, inline: true },
          { name: 'Fecha Nacimiento', value: dni.fechaNac, inline: true },
          { name: 'Nacionalidad / Género', value: dni.nacionalidadGenero, inline: false },
          { name: 'Creado', value: dni.fechaCreacion, inline: true }
        )
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

      const channel = interaction.guild.channels.cache.get(DNI_CHANNEL_ID);
      if (channel) {
        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ DNI del PJ${pj} enviado al canal de DNI.`, ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ No se encontró el canal de DNI.', ephemeral: true });
      }
    } else {
      // Borrar
      userData.pjs[pj].dni = null;
      userData.pjs[pj].carnetConducir = null;
      userData.pjs[pj].licenciaArmas = null;
      guardarIdentidades();
      await interaction.reply({ content: `🗑️ DNI del PJ${pj} eliminado correctamente.`, ephemeral: true });
    }
  }

  // ==================== CARNET DE CONDUCIR ====================
  else if (customId.startsWith('modal-carnet-')) {
    const action = customId.split('-')[2];
    const pj = interaction.fields.getTextInputValue('pj');
    if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', ephemeral: true });

    const dni = userData.pjs[pj].dni;
    if (!dni) return interaction.reply({ content: `❌ Primero debes crear el DNI del PJ${pj}.`, ephemeral: true });

    if (action === 'crear') {
      if (userData.pjs[pj].carnetConducir) return interaction.reply({ content: `❌ Ya tienes carnet de conducir en el PJ${pj}.`, ephemeral: true });
      const numero = `CC-${Math.floor(1000 + Math.random() * 9000)}`;
      const fecha = new Date().toLocaleDateString('es-ES');
      userData.pjs[pj].carnetConducir = { numero, fechaEmision: fecha };
      guardarIdentidades();
      await interaction.reply({ content: `✅ Carnet de Conducir creado para PJ${pj}\n**Número:** ${numero}`, ephemeral: true });
    }
    else if (action === 'ver') {
      const carnet = userData.pjs[pj].carnetConducir;
      if (!carnet) return interaction.reply({ content: `❌ No tienes carnet de conducir en el PJ${pj}.`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`🚗 CARNET DE CONDUCIR - PJ${pj}`)
        .setColor(0x00FF88)
        .addFields(
          { name: 'Número', value: carnet.numero, inline: true },
          { name: 'Emitido', value: carnet.fechaEmision, inline: true }
        )
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

      const channel = interaction.guild.channels.cache.get(CARNET_CHANNEL_ID);
      if (channel) {
        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Carnet del PJ${pj} enviado al canal de Carnets.`, ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ No se encontró el canal de Carnets.', ephemeral: true });
      }
    }
    else if (action === 'borrar') {
      if (!userData.pjs[pj].carnetConducir) return interaction.reply({ content: `❌ No tienes carnet para borrar en el PJ${pj}.`, ephemeral: true });
      userData.pjs[pj].carnetConducir = null;
      guardarIdentidades();
      await interaction.reply({ content: `🗑️ Carnet de conducir del PJ${pj} eliminado.`, ephemeral: true });
    }
  }

  // ==================== LICENCIA DE ARMAS ====================
  else if (customId.startsWith('modal-licencia-')) {
    const action = customId.split('-')[2];
    const pj = interaction.fields.getTextInputValue('pj');
    if (pj !== '1' && pj !== '2') return interaction.reply({ content: '❌ El PJ debe ser 1 o 2.', ephemeral: true });

    const dni = userData.pjs[pj].dni;
    if (!dni) return interaction.reply({ content: `❌ Primero debes crear el DNI del PJ${pj}.`, ephemeral: true });

    if (action === 'crear') {
      if (userData.pjs[pj].licenciaArmas) return interaction.reply({ content: `❌ Ya tienes licencia de armas en el PJ${pj}.`, ephemeral: true });
      const numero = `LA-${Math.floor(1000 + Math.random() * 9000)}`;
      const fecha = new Date().toLocaleDateString('es-ES');
      userData.pjs[pj].licenciaArmas = { numero, fechaEmision: fecha };
      guardarIdentidades();
      await interaction.reply({ content: `✅ Licencia de Armas creada para PJ${pj}\n**Número:** ${numero}`, ephemeral: true });
    }
    else if (action === 'ver') {
      const licencia = userData.pjs[pj].licenciaArmas;
      if (!licencia) return interaction.reply({ content: `❌ No tienes licencia de armas en el PJ${pj}.`, ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle(`🔫 LICENCIA DE ARMAS - PJ${pj}`)
        .setColor(0xFF8800)
        .addFields(
          { name: 'Número', value: licencia.numero, inline: true },
          { name: 'Emitida', value: licencia.fechaEmision, inline: true }
        )
        .setFooter({ text: `Solicitado por ${interaction.user.tag}` });

      const channel = interaction.guild.channels.cache.get(LICENCIA_CHANNEL_ID);
      if (channel) {
        await channel.send({ embeds: [embed] });
        await interaction.reply({ content: `✅ Licencia del PJ${pj} enviada al canal de Licencias.`, ephemeral: true });
      } else {
        await interaction.reply({ content: '❌ No se encontró el canal de Licencias.', ephemeral: true });
      }
    }
    else if (action === 'borrar') {
      if (!userData.pjs[pj].licenciaArmas) return interaction.reply({ content: `❌ No tienes licencia para borrar en el PJ${pj}.`, ephemeral: true });
      userData.pjs[pj].licenciaArmas = null;
      guardarIdentidades();
      await interaction.reply({ content: `🗑️ Licencia de armas del PJ${pj} eliminada.`, ephemeral: true });
    }
  }
}

// ======================
// 13. LOGIN
// ======================
client.login(process.env.TOKEN)
  .catch(err => console.error('❌ Error al iniciar sesión:', err));