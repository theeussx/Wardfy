import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Mostra seu perfil musical Wardfy.')
    .addUserOption((option) => option.setName('usuario').setDescription('Membro para visualizar')),
  new SlashCommandBuilder()
    .setName('ranking')
    .setDescription('Mostra o ranking musical do servidor.')
    .addStringOption((option) =>
      option
        .setName('metrica')
        .setDescription('O que classificar')
        .addChoices(
          { name: 'Minutos ouvidos', value: 'listeningMinutes' },
          { name: 'Músicas diferentes', value: 'tracks' },
          { name: 'Artistas diferentes', value: 'artists' },
          { name: 'Descobertas', value: 'discoveries' },
          { name: 'Gêneros', value: 'genres' },
        ),
    ),
  new SlashCommandBuilder()
    .setName('compatibilidade')
    .setDescription('Compara seu gosto musical com outro membro.')
    .addUserOption((option) =>
      option.setName('usuario').setDescription('Membro para comparar').setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('desafio')
    .setDescription('Veja e participe dos desafios musicais ativos.'),
  new SlashCommandBuilder()
    .setName('agora')
    .setDescription('Publica uma atualização do que você está ouvindo agora.'),
  new SlashCommandBuilder()
    .setName('configurar')
    .setDescription('Configura a experiência Wardfy neste servidor.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName('canal_atividade')
        .setDescription('Canal para as atualizações de atividade')
        .addChannelTypes(ChannelType.GuildText),
    )
    .addIntegerOption((option) =>
      option
        .setName('intervalo')
        .setDescription('Frequência de atualização em segundos (1–300)')
        .setMinValue(1)
        .setMaxValue(300),
    ),
].map((command) => command.toJSON());

export type WardfyCommandName =
  'perfil' | 'ranking' | 'compatibilidade' | 'desafio' | 'agora' | 'configurar';
