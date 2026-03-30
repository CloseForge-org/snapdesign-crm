import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface ExtractedListing {
  address?: string
  district?: string
  size_ping?: number
  unit_floor?: number
  total_floors?: number
  monthly_rent?: number
  room_layout?: string
  building_type?: string
  building_age?: number
  contact_name?: string
  contact_phone?: string
  photos?: string[]
  title?: string
  error?: string
  partial?: boolean
}

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'

function extract591Id(url: string): string | null {
  // https://rent.591.com.tw/home/12345 or https://rent.591.com.tw/home/12345?...
  const m = url.match(/rent\.591\.com\.tw\/home\/(\d+)/)
  return m ? m[1] : null
}

function extractDistrict(text: string): string | undefined {
  // Common Taipei/New Taipei districts
  const districts = [
    '中正區','大同區','中山區','松山區','大安區','萬華區','信義區','士林區',
    '北投區','內湖區','南港區','文山區',
    '板橋區','三重區','中和區','永和區','新莊區','新店區','樹林區','鶯歌區',
    '三峽區','淡水區','汐止區','瑞芳區','土城區','蘆洲區','五股區','泰山區',
    '林口區','深坑區','石碇區','坪林區','三芝區','石門區','八里區','平溪區',
    '雙溪區','貢寮區','金山區','萬里區','烏來區',
    '桃園區','中壢區','大溪區','楊梅區','蘆竹區','大園區','龜山區','八德區',
    '龍潭區','平鎮區','新屋區','觀音區','復興區',
  ]
  for (const d of districts) {
    if (text.includes(d)) return d
  }
  return undefined
}

function parsePing(text: string): number | undefined {
  // e.g. "28.5坪" or "28.5 坪" or "坪數：28.5"
  const m = text.match(/(\d+(?:\.\d+)?)\s*坪/)
  return m ? parseFloat(m[1]) : undefined
}

function parseFloor(text: string): { unit_floor?: number; total_floors?: number } {
  // "3樓/6層" or "3F/6F" or "3/6樓"
  let m = text.match(/(\d+)\s*[樓F]\s*[\/\-~～]\s*(\d+)\s*[樓層F]/)
  if (m) return { unit_floor: parseInt(m[1]), total_floors: parseInt(m[2]) }
  // "3樓"
  m = text.match(/(\d+)\s*樓/)
  if (m) return { unit_floor: parseInt(m[1]) }
  return {}
}

function parseRent(text: string): number | undefined {
  // "月租金：20,000" or "20,000元/月" or "20000"
  let m = text.match(/(\d{1,3}(?:,\d{3})+|\d+)\s*元?\s*\/?\s*月/)
  if (m) return parseInt(m[1].replace(/,/g, ''))
  m = text.match(/月租[金：:]\s*(\d{1,3}(?:,\d{3})+|\d+)/)
  if (m) return parseInt(m[1].replace(/,/g, ''))
  return undefined
}

function parseBuildingType(text: string): string | undefined {
  if (/透天/.test(text)) return 'townhouse'
  if (/公寓/.test(text)) return 'apartment'
  if (/大樓|華廈|電梯/.test(text)) return 'building'
  if (/套房/.test(text)) return 'studio'
  return undefined
}

function parseBuildingAge(text: string): number | undefined {
  // "屋齡：35年" or "35年"
  const m = text.match(/屋齡[：:]\s*(\d+)\s*年/)
  if (m) return parseInt(m[1])
  // "民國XX年建" → compute age
  const m2 = text.match(/民國\s*(\d+)\s*年/)
  if (m2) {
    const rocYear = parseInt(m2[1])
    const builtYear = 1911 + rocYear
    return new Date().getFullYear() - builtYear
  }
  return undefined
}

function parseRoomLayout(text: string): string | undefined {
  const m = text.match(/(\d\s*房\s*\d\s*廳(?:\s*\d\s*衛)?|\d\s*室\s*\d\s*廳(?:\s*\d\s*衛)?|\d[BRLK]+)/)
  return m ? m[1].replace(/\s+/g, '') : undefined
}

function parseMetaTags(html: string): Partial<ExtractedListing> {
  const result: Partial<ExtractedListing> = {}

  // og:title
  const titleM = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/)
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/)
  if (titleM) result.title = titleM[1]

  // og:description
  const descM = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/)
  if (descM) {
    const desc = descM[1]
    const ping = parsePing(desc)
    if (ping) result.size_ping = ping
    const floors = parseFloor(desc)
    if (floors.unit_floor) result.unit_floor = floors.unit_floor
    if (floors.total_floors) result.total_floors = floors.total_floors
    const rent = parseRent(desc)
    if (rent) result.monthly_rent = rent
    const layout = parseRoomLayout(desc)
    if (layout) result.room_layout = layout
    const bt = parseBuildingType(desc)
    if (bt) result.building_type = bt
    const age = parseBuildingAge(desc)
    if (age) result.building_age = age
    const district = extractDistrict(desc)
    if (district) result.district = district
  }

  // og:image
  const imgM = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/)
    || html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/)
  if (imgM) result.photos = [imgM[1]]

  return result
}

async function fetch591BFF(id: string): Promise<Partial<ExtractedListing>> {
  const url = `https://bff.591.com.tw/v1/house/rent/detail?id=${id}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'application/json',
        'Referer': `https://rent.591.com.tw/home/${id}`,
        'Origin': 'https://rent.591.com.tw',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {}
    const json = await res.json()
    const data = json?.data || json
    const result: Partial<ExtractedListing> = {}

    // Map known BFF fields
    if (data?.address) result.address = data.address
    if (data?.regionName || data?.section) result.district = data.regionName || data.section
    if (data?.area) result.size_ping = parseFloat(data.area)
    if (data?.floor) result.unit_floor = parseInt(data.floor)
    if (data?.allFloor || data?.total_floor) result.total_floors = parseInt(data.allFloor || data.total_floor)
    if (data?.price) result.monthly_rent = parseInt(String(data.price).replace(/,/g, ''))
    if (data?.pattern || data?.shape) result.room_layout = data.pattern || data.shape
    if (data?.houseType || data?.kind) {
      const bt = parseBuildingType(data.houseType || data.kind)
      if (bt) result.building_type = bt
    }
    if (data?.houseAge) result.building_age = parseInt(data.houseAge)

    // Photos
    if (Array.isArray(data?.photos)) {
      result.photos = data.photos.slice(0, 5).map((p: any) => p?.url || p?.src || p).filter(Boolean)
    }

    return result
  } catch {
    return {}
  }
}

async function fetch591HTML(id: string): Promise<Partial<ExtractedListing>> {
  const url = `https://rent.591.com.tw/home/${id}`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {}
    const html = await res.text()

    const result: Partial<ExtractedListing> = {}

    // Try meta tags first
    const meta = parseMetaTags(html)
    Object.assign(result, meta)

    // Try JSON-LD structured data
    const jsonLdMatches = html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)
    for (const m of jsonLdMatches) {
      try {
        const ld = JSON.parse(m[1])
        if (ld.address) {
          result.address = typeof ld.address === 'string'
            ? ld.address
            : ld.address.streetAddress || ld.address.addressLocality
        }
      } catch {}
    }

    // Try to find __NEXT_DATA__ or window.__DATA__
    const nextDataM = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (nextDataM) {
      try {
        const nd = JSON.parse(nextDataM[1])
        const props = nd?.props?.pageProps?.data || nd?.props?.pageProps
        if (props) {
          if (props.address && !result.address) result.address = props.address
          if (props.area && !result.size_ping) result.size_ping = parseFloat(props.area)
          if (props.price && !result.monthly_rent) result.monthly_rent = parseInt(String(props.price).replace(/,/g, ''))
        }
      } catch {}
    }

    // Extract from visible text — look for common data patterns
    const bodyText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

    if (!result.size_ping) result.size_ping = parsePing(bodyText)
    if (!result.unit_floor || !result.total_floors) {
      const floors = parseFloor(bodyText)
      if (!result.unit_floor && floors.unit_floor) result.unit_floor = floors.unit_floor
      if (!result.total_floors && floors.total_floors) result.total_floors = floors.total_floors
    }
    if (!result.monthly_rent) result.monthly_rent = parseRent(bodyText)
    if (!result.room_layout) result.room_layout = parseRoomLayout(bodyText)
    if (!result.building_type) result.building_type = parseBuildingType(bodyText)
    if (!result.building_age) result.building_age = parseBuildingAge(bodyText)
    if (!result.district) result.district = extractDistrict(bodyText)

    // Address from title
    if (!result.address && result.title) {
      // 591 titles often include address like "台北市大安區...出租"
      const addrM = result.title.match(/台[北南中東西]市[^\s,，]+/)
        || result.title.match(/新北市[^\s,，]+/)
        || result.title.match(/[\u4e00-\u9fff]{2,}[路街道巷弄]\d*號/)
      if (addrM) result.address = addrM[0]
    }

    return result
  } catch {
    return {}
  }
}

async function fetchGenericListing(url: string): Promise<Partial<ExtractedListing>> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': BROWSER_UA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return {}
    const html = await res.text()
    const result: Partial<ExtractedListing> = parseMetaTags(html)

    const bodyText = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
    if (!result.size_ping) result.size_ping = parsePing(bodyText)
    if (!result.monthly_rent) result.monthly_rent = parseRent(bodyText)
    if (!result.room_layout) result.room_layout = parseRoomLayout(bodyText)
    if (!result.building_type) result.building_type = parseBuildingType(bodyText)
    if (!result.building_age) result.building_age = parseBuildingAge(bodyText)
    if (!result.district) result.district = extractDistrict(bodyText)

    const floors = parseFloor(bodyText)
    if (floors.unit_floor) result.unit_floor = floors.unit_floor
    if (floors.total_floors) result.total_floors = floors.total_floors

    return result
  } catch {
    return {}
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { url } = body

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: '請提供有效的網址' }, { status: 400 })
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url.trim())
    } catch {
      return NextResponse.json({ error: '網址格式不正確' }, { status: 400 })
    }

    const result: ExtractedListing = {}

    // 591 specific
    const id591 = extract591Id(parsedUrl.href)
    if (id591) {
      // Try BFF API first (usually more structured)
      const bffData = await fetch591BFF(id591)
      Object.assign(result, bffData)

      // Fill any missing fields from HTML
      const htmlData = await fetch591HTML(id591)
      for (const [k, v] of Object.entries(htmlData)) {
        if (v !== undefined && (result as any)[k] === undefined) {
          ;(result as any)[k] = v
        }
      }
    } else {
      // Generic listing
      const genericData = await fetchGenericListing(parsedUrl.href)
      Object.assign(result, genericData)
    }

    // Count filled fields
    const fieldsCount = Object.keys(result).filter(k =>
      k !== 'error' && k !== 'partial' && k !== 'title' && result[k as keyof ExtractedListing] !== undefined
    ).length

    if (fieldsCount === 0) {
      return NextResponse.json({
        ...result,
        partial: false,
        error: '無法擷取資料，請手動輸入',
      })
    }

    return NextResponse.json({ ...result, partial: fieldsCount < 3 })
  } catch (err: any) {
    console.error('extract-listing error:', err)
    return NextResponse.json(
      { error: '擷取失敗，請手動輸入', partial: false },
      { status: 200 } // Return 200 so client handles gracefully
    )
  }
}
