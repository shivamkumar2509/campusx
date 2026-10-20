import api from "./axios";

export const fetchReplacements = (teamId) =>
  api.get(`/teams/${teamId}/replacements`).then((r) => r.data.data);

export const findReplacement = (teamId, body = {}) =>
  api.post(`/teams/${teamId}/find-replacement`, body).then((r) => r.data.data);

export const inviteReplacement = (teamId, suggestionId) =>
  api
    .post(`/teams/${teamId}/replacements/${suggestionId}/invite`)
    .then((r) => r.data.data);

export const respondToInvitation = (teamId, invitationId, response) =>
  api
    .post(`/teams/${teamId}/invitations/${invitationId}/respond`, { response })
    .then((r) => r.data.data);
