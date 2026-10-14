import React from 'react';
import {registerRoot, Composition} from 'remotion';
import {LivingScrapbook} from './video';
const Root=()=> <><Composition id="Landscape" component={LivingScrapbook} width={1920} height={1080} fps={30} durationInFrames={1200}/><Composition id="Vertical" component={LivingScrapbook} width={1080} height={1920} fps={30} durationInFrames={1200}/></>;
registerRoot(Root);
