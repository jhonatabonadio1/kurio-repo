import { CHAIN_LABELS, type NftDetail } from '@/contracts/catalog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import { RatingStars } from './rating-stars'

/** Figma "Description": NFT details and collector reviews. */
export function NftInfoTabs({ nft }: { nft: NftDetail }) {
  return (
    <Tabs defaultValue="details">
      <TabsList aria-label="Informações do NFT">
        <TabsTrigger value="details">Detalhes do NFT</TabsTrigger>
        <TabsTrigger value="reviews">Avaliações de colecionadores ({nft.rating.count})</TabsTrigger>
      </TabsList>
      <TabsContent value="details" className="flex flex-col gap-3 text-sm leading-6 text-text-secondary md:text-base">
        <p>{nft.description}</p>
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="font-bold text-foreground">Rede:</dt>
            <dd>Cunhado na {CHAIN_LABELS[nft.chain]} com procedência imutável e metadados armazenados no IPFS.</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Contrato:</dt>
            <dd>{nft.contract} • Contrato inteligente ERC-721 verificado.</dd>
          </div>
          <div>
            <dt className="font-bold text-foreground">Direitos autorais:</dt>
            <dd>
              {nft.creator.royaltyPercent}% para {nft.creator.name} nas vendas secundárias, pagos automaticamente pelos
              marketplaces compatíveis.
            </dd>
          </div>
        </dl>
      </TabsContent>
      <TabsContent value="reviews" className="flex flex-col gap-3 text-sm leading-6 text-text-secondary">
        <RatingStars average={nft.rating.average} count={nft.rating.count} />
        <p>
          Média {nft.rating.average.toLocaleString('pt-BR')} de 5 em {nft.rating.count} avaliações. Os comentários
          individuais não fazem parte desta demonstração.
        </p>
      </TabsContent>
    </Tabs>
  )
}
