* {
    box-sizing: border-box;
}

body {
    margin: 0;
    padding: 0;
    background: black;
    color: white;
    font-family: sans-serif;
}

.full-height {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  text-transform: uppercase;
  padding: 5rem 2rem;

  &--large {
    height: 150vh;
    align-items: center;
    justify-content: flex-start;
    gap: 5rem;
  }
}

.services__title-wrapper {
    position: sticky;
    top: 0;
    z-index: 2;
    padding-top: 1.2rem;
    width: 100%;
    text-align: center;

  h2 {
    font-size: 1rem;
  }
}

.service__label,
.services__item {
  font-size: 4.5rem;
  text-transform: uppercase;
}

.services__wrapper {
    position: relative;
}

.services__hidden-list {
    display: block;
    pointer-events: none;
    visibility: hidden;
}

.services__list-container {
    position: absolute;
    top: -100vh;
    left: 0;
    width: 100%;
    height: calc(100% + 200vh);
    display: flex;
    justify-content: center;
    pointer-events: none;
}

.services__list-sticky {
    position: sticky;
    top: 0;
    width: 100vw;
    height: 100vh;
    perspective: 100rem;
    overflow: hidden;
}

.services__list {
    display: flex;
    flex-direction: column;
    list-style: none;
    padding: unset;
    grid-column-end: span 24;
    position: relative;
    width: 100%;
    height: 100%;
    transform: translate3d(0px, 0px, 0px) rotateX(-80deg);
    transform-style: preserve-3d;
    transform-origin: 50% 50%;
}

.services__item {
    color: white;
    position: absolute;
    top: 50%;
    left: 50%;
    white-space: nowrap;
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    text-align: center;
}

gsap.set('.services__list', {
  rotationX: -80
});

let tl = gsap.timeline({
    scrollTrigger: {
      trigger: '.services__list-container',
      start: 'top+=20% top',
      end: 'bottom bottom',
      scrub: .75,
      invalidateOnRefresh: true
    }
});

tl.fromTo('.services__list', {
  rotationX: -80
}, {
  rotationX: 270
});

<div class="full-height full-height--large">
  <p>First section</p>
  <p>Keep scrolling</p>
</div>
<div class="services">
  <div class="services__title-wrapper">
    <div class="section-title grid">
      <h2 class="section-title__content">
        Services
      </h2>
    </div>
   </div>
<div class="services__wrapper">
  <div aria-hidden="true" class="services__hidden-list">
    <div class="service__label">
        Service 1
      </div><div class="service__label">
        Service 2
      </div><div class="service__label">
        Service 3
      </div><div class="service__label">
        Service 4
      </div><div class="service__label">
        Service 5
      </div><div class="service__label">
        Service 6
      </div><div class="service__label">
        Service 7
      </div><div class="service__label">
        Service 8
      </div><div class="service__label">
        Service 9
      </div><div class="service__label">
        Service 10
      </div>
  </div>
  <div class="services__list-container">
    <div class="services__list-sticky">
      <ul class="services__list">
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(-0.25px, 0px, 280px);">
            Service 1
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 86.5248px, 266.296px) rotateX(-20deg);">
            Service 2
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 164.58px, 226.525px) rotateX(-40deg);">
            Service 3
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(-0.25px, 226.525px, 164.58px) rotateX(-60deg);">
            Service 4
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 266.296px, 86.5248px) rotateX(-80deg);">
            Service 5
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 280px, 0px) rotateX(-100deg);">
           Service 6
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 266.296px, -86.5248px) rotateX(-120deg);">
            Service 7
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 226.525px, -164.58px) rotateX(-140deg);">
            Service 8
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 164.58px, -226.525px) rotateX(-160deg);">
            Service 9
          </li>
        <li class="services__item" style="translate: none; rotate: none; scale: none; transform-origin: 50% 50%; transform: translate(-50%, -50%) translate3d(0px, 86.5248px, -266.296px) rotateX(-180deg);">
            Service 10
          </li>
      </ul>
    </div>
  </div>
</div>
</div>

<div class="full-height">
  Follow up section
</div>

<div class="full-height">
  Footer
</div>
