import 'react';

// Fix: Augmenting the global React namespace to include non-standard directory attributes for HTML input elements.
// Using declare global ensures the augmentation is applied to the React namespace regardless of module resolution issues
// with the 'react' package name in certain TypeScript environments.
declare global {
    namespace React {
        interface InputHTMLAttributes<T> {
            webkitdirectory?: string;
            directory?: string;
        }
    }
}

export interface PlaylistItem {
  id: string;
  name: string;
  group: string;
  logo: string;
  url: string;
}