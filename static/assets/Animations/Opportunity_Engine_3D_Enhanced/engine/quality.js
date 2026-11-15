import { ACESFilmicToneMapping, SRGBColorSpace, PCFSoftShadowMap } from 'three';

export const RENDER_PROFILES = Object.freeze({
  low:      {maxPixelRatio:1,    shadowSize:0,    shadows:false, fog:false,  decorativeDensity:0.25},
  balanced: {maxPixelRatio:1.5,  shadowSize:1024, shadows:true,  fog:true,   decorativeDensity:0.65},
  high:     {maxPixelRatio:1.85, shadowSize:2048, shadows:true,  fog:true,   decorativeDensity:1},
});

export function getRenderProfile(name='balanced') {
  return RENDER_PROFILES[name] || RENDER_PROFILES.balanced;
}

/** Pass to createAnimation({ configureRenderer: configureQualityRenderer(...) }). */
export function configureQualityRenderer(name='balanced', overrides={}) {
  const profile={...getRenderProfile(name),...overrides};
  return renderer => {
    renderer.outputColorSpace=SRGBColorSpace;
    renderer.toneMapping=ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.12;
    renderer.shadowMap.enabled=profile.shadows;
    if(profile.shadows)renderer.shadowMap.type=PCFSoftShadowMap;
  };
}
