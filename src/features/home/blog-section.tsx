import type { ArtworkKey } from '@/shared/ui/artwork-manifest'
import { NftArtwork } from '@/shared/ui/nft-artwork'
import { OutOfScopeLink } from '@/shared/ui/out-of-scope'

const POSTS: { art: ArtworkKey; meta: string; title: string; text: string }[] = [
  { art: 'neon-vessel', meta: '12 de setembro | Leitura de 6 min', title: 'Como funciona a propriedade de NFTs', text: 'Aprenda a colecionar, negociar e verificar ativos digitais.' },
  { art: 'emerald-ape', meta: '13 de setembro | Leitura de 2 min', title: '10 artistas digitais para acompanhar', text: 'Conheça criadores que moldam a cultura digital.' },
  { art: 'sage-nomad', meta: '15 de setembro | Leitura de 3 min', title: 'Raridade, atributos e procedência', text: 'Entenda raridade, procedência, direitos autorais e utilidade.' },
  { art: 'golden-beat', meta: '15 de setembro | Leitura de 2 min', title: 'Como proteger sua carteira', text: 'Proteja sua carteira, seus ativos e sua identidade.' },
]

/** "Diário da Cunhagem" (Figma "Blog"). Editorial pages are out of scope. */
export function BlogSection() {
  return (
    <section aria-labelledby="blog-title" className="flex flex-col gap-10">
      <header className="flex flex-col gap-3 text-center">
        <h2 id="blog-title" className="text-2xl font-bold md:text-[32px]">
          Diário da Cunhagem
        </h2>
        <p className="text-[13px] text-text-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da propriedade digital.
        </p>
      </header>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {POSTS.map((post) => (
          <li key={post.title} className="flex flex-col overflow-hidden rounded-lg bg-card">
            <NftArtwork image={{ key: post.art, alt: '' }} sizes="(min-width: 1024px) 268px, 45vw" className="aspect-[268/195] w-full rounded-none object-[50%_20%]" />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <p className="text-xs leading-4 text-text-secondary">{post.meta}</p>
              <h3 className="text-sm leading-5 font-bold">{post.title}</h3>
              <p className="flex-1 text-xs leading-4 text-text-secondary">{post.text}</p>
              <OutOfScopeLink feature={`Artigo: ${post.title}`} className="self-start text-xs font-bold text-text-accent hover:underline">
                Ler mais <span aria-hidden>→</span>
                <span className="sr-only">: {post.title}</span>
              </OutOfScopeLink>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
