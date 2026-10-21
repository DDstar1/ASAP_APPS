// One entry per company in the ASAP group. The homepage carousel and the blog
// both read from here; a post with an empty `body` shows as "coming soon".
export type Post = {
  slug: string
  brand: string
  title: string
  summary: string
  tags: string[]
  image: string
  // Tailwind classes for the image inside its dark tile
  imageClass: string
  body: string[]
}

export const POSTS: Post[] = [
  {
    slug: 'zazu',
    brand: 'Zazu',
    title: 'Commerce that lives where your customers already are',
    summary: 'Vendor bots and ordering that let any store take orders without building an app of its own.',
    tags: ['Commerce', 'Vendor bots', 'Ordering'],
    image: '/ecosystem/web.jpg',
    imageClass: 'object-cover',
    body: [],
  },
  {
    slug: 'asap-logistics',
    brand: 'ASAP',
    title: 'Logistics operations, dispatch and the API behind them',
    summary: 'The engine that moves every package: rider dispatch, trip operations and an API other businesses can build on.',
    tags: ['Logistics', 'Dispatch', 'API'],
    image: '/ecosystem/globe.jpg',
    imageClass: 'object-contain p-4',
    body: [],
  },
  {
    slug: 'asap-fleet-holdings',
    brand: 'ASAP Fleet Holdings',
    title: 'Own the vehicles that keep the city moving',
    summary: 'Asset ownership and leasing that let people own part of the ASAP fleet and earn as it works.',
    tags: ['Asset ownership', 'Leasing', 'Fleet'],
    image: '/ecosystem/tree.jpg',
    imageClass: 'object-contain p-10 invert',
    body: [],
  },
]

export function getPost(slug: string) {
  return POSTS.find((p) => p.slug === slug)
}
