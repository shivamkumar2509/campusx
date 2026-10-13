import api from "./axios";

export async function fetchReplacements(teamId) {
  const { data } = await api.get(`/teams/${teamId}/replacements`);
  return data.data;
}

export async function findReplacement(teamId, body) {
  const { data } = await api.post(`/teams/${teamId}/find-replacement`, body);
  return data.data;
}

export async function inviteReplacement(teamId, suggestionId) {
  const { data } = await api.post(
    `/teams/${teamId}/replacements/${suggestionId}/invite`
  );
  return data.data;
}