<template>
  <div class="wrap">
    <Background />
    <article>
      <p><strong>Moving Objects</strong> is the independent creative studio of Scott Thiessen.</p>
      <p>Scott is a Seattle-based design technologist and front-end developer endeavoring to create interactive
        experiences that engage people in new and memorable ways.</p>
    </article>
  </div>
</template>

<script setup>
import { THEME } from '~/config/theme'

useHead({
  title: 'Moving Objects — Creative Studio of Scott Thiessen',
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0, viewport-fit=cover'
    },
    {
      name: 'description',
      content: 'Independent creative studio of Scott Thiessen, a Seattle-based design technologist and front-end developer creating interactive experiences.'
    },
    {
      property: 'og:title',
      content: 'Moving Objects — Creative Studio of Scott Thiessen'
    },
    {
      property: 'og:description',
      content: 'Independent creative studio of Scott Thiessen, a Seattle-based design technologist and front-end developer creating interactive experiences.'
    },
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:url',
      content: 'https://movingobjects.io'
    }
  ],
  link: [],
  style: [
    `body { background-color: ${THEME.colors.bg}; }`
  ]
})

onMounted(() => {
  Object.entries(THEME.colors).forEach(([key, value]) => {
    document.documentElement.style.setProperty(`--color-${key}`, value)
  })
})

</script>

<style>
/* PP Model Plastic */
@font-face {
  font-family: 'PP Model Plastic';
  src: url('/fonts/PPModelPlastic-Book.woff2') format('woff2'),
    url('/fonts/PPModelPlastic-Book.woff') format('woff');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'PP Model Plastic';
  src: url('/fonts/PPModelPlastic-Bold.woff2') format('woff2'),
    url('/fonts/PPModelPlastic-Bold.woff') format('woff');
  font-weight: 700;
  font-style: normal;
  font-display: swap;
}

body {
  background-color: var(--color-bg);
  color: var(--color-primary);
}

::selection {
  background-color: var(--color-bg);
  color: var(--color-secondary);
}
</style>

<style scoped lang="scss">
.wrap {
  font-family:
    'PP Model Plastic',
    system-ui,
    sans-serif;
}

article {
  font-size: 60px;
  padding: 1em;
}

p {
  letter-spacing: -0.05em;
  font-weight: 400;
  border-radius: 10px 0 10px 0;
  padding: 0px 5px;

  &:first-child {
    margin-top: 0;
  }

  strong {
    font-weight: 700;
  }
}

@media (max-width: 1200px) {
  article {
    font-size: 50px;
  }
}

@media (max-width: 900px) {
  article {
    font-size: 40px;
  }
}

@media (max-width: 700px) {
  article {
    font-size: 25px;
  }
}
</style>
