import api from "./axios";

export const castLeaderVote = (teamId, candidate_id) =>
  api
    .post(`/teams/${teamId}/leader/vote`, { candidate_id })
    .then((r) => r.data.data);

export const fetchTeamVotes = (teamId) =>
  api.get(`/teams/${teamId}/votes`).then((r) => r.data.data);

export const declareLeader = (teamId) =>
  api.post(`/teams/${teamId}/leader/declare`).then((r) => r.data.data);
