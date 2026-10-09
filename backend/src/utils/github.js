const axios = require("axios");

// ===== FETCH GITHUB USER =====
const fetchGithubUser = async (username) => {
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const { data } = await axios.get(
      `https://api.github.com/users/${username}`,
      { headers, timeout: 10000 },
    );
    return data;
  } catch (error) {
    if (error.response?.status === 404)
      throw new Error("GitHub user not found");
    if (error.response?.status === 403)
      throw new Error("GitHub rate limit exceeded");
    throw new Error("Failed to fetch GitHub user");
  }
};

// ===== FETCH GITHUB REPOS =====
const fetchGithubRepos = async (username) => {
  try {
    const headers = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const { data } = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers, timeout: 10000 },
    );
    return data;
  } catch (error) {
    if (error.response?.status === 404)
      throw new Error("GitHub user not found");
    throw new Error("Failed to fetch GitHub repos");
  }
};

// ===== ANALYZE REPOS =====
const analyzeRepos = (repos) => {
  const languageCount = {};
  const repoList = [];

  repos.forEach((repo) => {
    if (repo.language) {
      languageCount[repo.language] = (languageCount[repo.language] || 0) + 1;
    }
    repoList.push({
      name: repo.name,
      description: repo.description || "",
      language: repo.language || "Unknown",
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      url: repo.html_url,
      updated_at: repo.updated_at,
    });
  });

  const topLanguages = Object.entries(languageCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lang]) => lang);

  return {
    public_repos: repos.length,
    top_languages: topLanguages,
    language_count: languageCount,
    recent_repos: repoList, // all content
  };
};

// ===== CHECK IF SKILL IS TECHNICAL =====
// ===== CHECK IF SKILL IS TECHNICAL =====
const TECHNICAL_SKILLS = [
  // Languages
  "javascript",
  "typescript",
  "python",
  "java",
  "c++",
  "cpp",
  "c#",
  "golang",
  "go",
  "rust",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "dart",
  "scala",
  "matlab",
  "sql",
  "c",
  "r",
  "c language",
  "c lang",
  "r language",
  "r programming",
  // Frontend
  "react",
  "next.js",
  "nextjs",
  "vue",
  "angular",
  "svelte",
  "html",
  "css",
  "tailwind",
  "bootstrap",
  "sass",
  "scss",
  // Backend
  "node.js",
  "node",
  "nodejs",
  "express",
  "nestjs",
  "django",
  "flask",
  "fastapi",
  "spring",
  "spring boot",
  "laravel",
  "rails",
  // Databases
  "mongodb",
  "mysql",
  "postgresql",
  "postgres",
  "redis",
  "sqlite",
  // DevOps
  "docker",
  "kubernetes",
  "k8s",
  "aws",
  "azure",
  "gcp",
  "git",
  "linux",
  "bash",
  // ML/Data
  "machine learning",
  "deep learning",
  "tensorflow",
  "pytorch",
  "data science",
  "pandas",
  "numpy",
  "scikit-learn",
  "opencv",
  "nlp",
  // Mobile
  "react native",
  "flutter",
  "android",
  "ios",
  // Others
  "graphql",
  "rest api",
  "socket.io",
  "firebase",
  "blockchain",
];

const isTechnicalSkill = (skillName) => {
  if (!skillName) return false;
  const lower = skillName.toLowerCase().trim();

  // Single-letter skills — exact match only (c, r)
  if (lower.length === 1) {
    return lower === "c" || lower === "r";
  }

  // Check "X language" pattern — c language, r language, etc.
  const languageMatch = lower.match(
    /^([a-z+#]+)\s+(language|lang|programming)$/,
  );
  if (languageMatch) {
    const baseLang = languageMatch[1];
    if (baseLang === "c" || baseLang === "r") return true;
    if (TECHNICAL_SKILLS.includes(baseLang)) return true;
  }

  // For short skills (<= 3 chars), exact match
  if (lower.length <= 3) {
    return TECHNICAL_SKILLS.includes(lower);
  }

  // For longer skills, check exact match OR substring match
  return TECHNICAL_SKILLS.some((tech) => {
    if (tech.length <= 2) return false;
    if (tech.length <= 4) {
      return lower === tech;
    }
    return lower === tech || lower.includes(tech) || tech.includes(lower);
  });
};
module.exports = {
  fetchGithubUser,
  fetchGithubRepos,
  analyzeRepos,
  isTechnicalSkill,
};
