import React from 'react';

export const Logo = (props: { className?: string }) => (
  <img src="/icon.png" alt="FinansiaProf Logo" className={props.className} style={{ objectFit: 'contain' }} />
);
