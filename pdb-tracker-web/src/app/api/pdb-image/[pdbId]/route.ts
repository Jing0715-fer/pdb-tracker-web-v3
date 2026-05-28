import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pdbId: string }> }
) {
  const { pdbId } = await params;
  const id = pdbId.toUpperCase();

  if (!/^[A-Za-z0-9]{4}$/.test(id)) {
    return NextResponse.json(
      { error: 'Invalid PDB ID format' },
      { status: 400 }
    );
  }

  const lower = id.toLowerCase();

  // Try multiple image sources in order of preference
  const imageSources = [
    // PDBe (EBI) - most reliable, has images for most entries
    {
      url: `https://www.ebi.ac.uk/pdbe/static/entry/${lower}_deposited_chain_front_image-200x200.png`,
      label: 'PDBe 200x200',
    },
    {
      url: `https://www.ebi.ac.uk/pdbe/static/entry/${lower}_deposited_chain_front_image-800x800.png`,
      label: 'PDBe 800x800',
    },
    // RCSB CDN - legacy format, may not work for all entries
    {
      url: `https://cdn.rcsb.org/images/rCSB/${lower.substring(1, 3)}/${lower}/${lower}.thumb_350.png`,
      label: 'RCSB CDN',
    },
  ];

  for (const source of imageSources) {
    try {
      const response = await fetch(source.url, {
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'image/png,image/jpeg,image/webp',
        },
      });

      if (response.ok) {
        const imageBuffer = await response.arrayBuffer();
        const contentType = response.headers.get('content-type') || 'image/png';

        return new NextResponse(imageBuffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400, s-maxage=86400',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
    } catch {
      continue;
    }
  }

  return NextResponse.json(
    { error: `No preview image available for ${id}` },
    { status: 404 }
  );
}
