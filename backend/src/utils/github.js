const axios = require("axios");

const GITHUB_HEADERS = () => {
  const headers = { Accept: "application/vnd.github+json" };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
};

const fetchGithubUser = async (username) => {
  try {
    const { data } = await axios.get(
      `https://api.github.com/users/${username}`,
      { headers: GITHUB_HEADERS(), timeout: 10000 },
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

const fetchGithubRepos = async (username) => {
  try {
    const { data } = await axios.get(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
      { headers: GITHUB_HEADERS(), timeout: 10000 },
    );
    return data;
  } catch (error) {
    if (error.response?.status === 404)
      throw new Error("GitHub user not found");
    throw new Error("Failed to fetch GitHub repos");
  }
};

const FRAMEWORK_RULES = [
  {
    file: "package.json",
    parse: "json",
    detect: (pkg) => {
      const deps = {
        ...(pkg.dependencies || {}),
        ...(pkg.devDependencies || {}),
      };
      const found = [];
      const map = {
        react: "React",
        "react-dom": "React",
        next: "Next.js",
        vue: "Vue",
        nuxt: "Nuxt",
        "@angular/core": "Angular",
        svelte: "Svelte",
        express: "Express",
        fastify: "Fastify",
        koa: "Koa",
        nestjs: "NestJS",
        "@nestjs/core": "NestJS",
        tailwindcss: "Tailwind CSS",
        bootstrap: "Bootstrap",
        sass: "Sass",
        "styled-components": "styled-components",
        "socket.io": "Socket.IO",
        graphql: "GraphQL",
        "@apollo/client": "Apollo GraphQL",
        redux: "Redux",
        zustand: "Zustand",
        "react-query": "React Query",
        "@tanstack/react-query": "React Query",
        mongoose: "Mongoose",
        prisma: "Prisma",
        "@prisma/client": "Prisma",
        sequelize: "Sequelize",
        typeorm: "TypeORM",
        jest: "Jest",
        vitest: "Vitest",
        mocha: "Mocha",
        cypress: "Cypress",
        playwright: "Playwright",
        webpack: "Webpack",
        vite: "Vite",
        rollup: "Rollup",
        eslint: "ESLint",
        prettier: "Prettier",
        typescript: "TypeScript",
      };
      for (const [dep, tech] of Object.entries(map)) {
        if (deps[dep]) found.push(tech);
      }
      return found;
    },
  },
  {
    file: "requirements.txt",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = [];
      const map = {
        django: "Django",
        flask: "Flask",
        fastapi: "FastAPI",
        "scikit-learn": "scikit-learn",
        tensorflow: "TensorFlow",
        torch: "PyTorch",
        pytorch: "PyTorch",
        pandas: "pandas",
        numpy: "NumPy",
        opencv: "OpenCV",
        "opencv-python": "OpenCV",
        beautifulsoup4: "BeautifulSoup",
        scrapy: "Scrapy",
        celery: "Celery",
        redis: "Redis",
        sqlalchemy: "SQLAlchemy",
        pydantic: "Pydantic",
        streamlit: "Streamlit",
        gradio: "Gradio",
      };
      for (const [dep, tech] of Object.entries(map)) {
        if (lower.includes(dep)) found.push(tech);
      }
      return found;
    },
  },
  {
    file: "pyproject.toml",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = [];
      if (lower.includes("django")) found.push("Django");
      if (lower.includes("flask")) found.push("Flask");
      if (lower.includes("fastapi")) found.push("FastAPI");
      if (lower.includes("pytorch") || lower.includes("torch"))
        found.push("PyTorch");
      return found;
    },
  },
  {
    file: "pom.xml",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = [];
      if (lower.includes("spring-boot")) found.push("Spring Boot");
      if (lower.includes("spring-web")) found.push("Spring");
      if (lower.includes("hibernate")) found.push("Hibernate");
      return found;
    },
  },
  {
    file: "build.gradle",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = [];
      if (lower.includes("spring-boot")) found.push("Spring Boot");
      if (lower.includes("hibernate")) found.push("Hibernate");
      if (lower.includes("android")) found.push("Android");
      return found;
    },
  },
  {
    file: "go.mod",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = [];
      if (lower.includes("gin-gonic")) found.push("Gin");
      if (lower.includes("echo")) found.push("Echo");
      if (lower.includes("fiber")) found.push("Fiber");
      if (lower.includes("gorm.io")) found.push("GORM");
      return found;
    },
  },
  {
    file: "Cargo.toml",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = [];
      if (lower.includes("actix-web")) found.push("Actix");
      if (lower.includes("rocket")) found.push("Rocket");
      if (lower.includes("tokio")) found.push("Tokio");
      return found;
    },
  },
  {
    file: "Gemfile",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = [];
      if (lower.includes("rails")) found.push("Rails");
      if (lower.includes("sinatra")) found.push("Sinatra");
      return found;
    },
  },
  {
    file: "composer.json",
    parse: "json",
    detect: (pkg) => {
      const deps = {
        ...(pkg.require || {}),
        ...(pkg["require-dev"] || {}),
      };
      const found = [];
      if (deps["laravel/framework"]) found.push("Laravel");
      if (deps["symfony/symfony"]) found.push("Symfony");
      return found;
    },
  },
  {
    file: "docker-compose.yml",
    parse: "text",
    detect: (content) => {
      const lower = content.toLowerCase();
      const found = ["Docker"];
      if (lower.includes("postgres")) found.push("PostgreSQL");
      if (lower.includes("mysql")) found.push("MySQL");
      if (lower.includes("mongo")) found.push("MongoDB");
      if (lower.includes("redis")) found.push("Redis");
      return found;
    },
  },
  {
    file: "Dockerfile",
    parse: "text",
    detect: () => ["Docker"],
  },
];

const fetchRepoFile = async (owner, repo, path) => {
  try {
    const { data } = await axios.get(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers: GITHUB_HEADERS(), timeout: 10000 },
    );
    if (data.content && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
};

const detectFrameworksInRepo = async (owner, repoName) => {
  const detected = new Set();

  const results = await Promise.allSettled(
    FRAMEWORK_RULES.map(async (rule) => {
      const content = await fetchRepoFile(owner, repoName, rule.file);
      if (!content) return [];

      try {
        if (rule.parse === "json") {
          return rule.detect(JSON.parse(content));
        }
        return rule.detect(content);
      } catch {
        return [];
      }
    }),
  );

  results.forEach((r) => {
    if (r.status === "fulfilled") {
      r.value.forEach((t) => detected.add(t));
    }
  });

  return [...detected];
};

const detectAllFrameworks = async (owner, repos) => {
  const allFrameworks = new Set();
  const repoFrameworks = {};

  const reposToScan = repos.slice(0, 20);

  const CONCURRENCY = 5;
  for (let i = 0; i < reposToScan.length; i += CONCURRENCY) {
    const batch = reposToScan.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.allSettled(
      batch.map((repo) => detectFrameworksInRepo(owner, repo.name)),
    );

    batchResults.forEach((r, idx) => {
      if (r.status === "fulfilled") {
        repoFrameworks[batch[idx].name] = r.value;
        r.value.forEach((f) => allFrameworks.add(f));
      }
    });
  }

  return {
    all_frameworks: [...allFrameworks],
    repo_frameworks: repoFrameworks,
  };
};

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

  const allLanguages = Object.entries(languageCount)
    .sort((a, b) => b[1] - a[1])
    .map(([lang]) => lang);

  return {
    public_repos: repos.length,
    top_languages: topLanguages,
    all_languages: allLanguages,
    language_count: languageCount,
    recent_repos: repoList,
  };
};

const TECHNICAL_SKILLS = [
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

  "react",
  "next.js",
  "nextjs",
  "vue",
  "nuxt",
  "angular",
  "svelte",
  "html",
  "css",
  "tailwind",
  "tailwind css",
  "bootstrap",
  "sass",
  "scss",
  "styled-components",

  "node.js",
  "node",
  "nodejs",
  "express",
  "fastify",
  "koa",
  "nestjs",
  "django",
  "flask",
  "fastapi",
  "spring",
  "spring boot",
  "laravel",
  "rails",
  "symfony",
  "gin",
  "echo",
  "fiber",
  "actix",
  "rocket",
  "tokio",

  "mongodb",
  "mysql",
  "postgresql",
  "postgres",
  "redis",
  "sqlite",
  "mongoose",
  "prisma",
  "sequelize",
  "typeorm",
  "sqlalchemy",
  "gorm",
  "hibernate",

  "docker",
  "kubernetes",
  "k8s",
  "aws",
  "azure",
  "gcp",
  "git",
  "linux",
  "bash",

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
  "beautifulsoup",
  "scrapy",
  "celery",
  "pydantic",
  "streamlit",
  "gradio",

  "react native",
  "flutter",
  "android",
  "ios",

  "graphql",
  "apollo graphql",
  "rest api",
  "socket.io",
  "firebase",
  "blockchain",
  "redux",
  "zustand",
  "react query",

  "eslint",
  "prettier",
  "webpack",
  "vite",
  "rollup",
  "jest",
  "vitest",
  "mocha",
  "cypress",
  "playwright",
];

const isTechnicalSkill = (skillName) => {
  if (!skillName) return false;
  const lower = skillName.toLowerCase().trim();

  if (lower.length === 1) {
    return lower === "c" || lower === "r";
  }

  const languageMatch = lower.match(
    /^([a-z+#]+)\s+(language|lang|programming)$/,
  );
  if (languageMatch) {
    const baseLang = languageMatch[1];
    if (baseLang === "c" || baseLang === "r") return true;
    if (TECHNICAL_SKILLS.includes(baseLang)) return true;
  }

  if (lower.length <= 3) {
    return TECHNICAL_SKILLS.includes(lower);
  }

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
  detectAllFrameworks,
  detectFrameworksInRepo,
};
