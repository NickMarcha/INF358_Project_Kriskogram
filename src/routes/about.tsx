import { createFileRoute, Link } from '@tanstack/react-router'

import graserGull from '@/assets/GraserGullMigration.png'
import originalKriskogram from '@/assets/Original-Kriskogram.png'
import explorerImg from '@/assets/explorer.png'
import egoFocusImg from '@/assets/ego-focus.png'
import temporalStaticImg from '@/assets/temporal-static.png'
import temporalAnimatedImg from '@/assets/temporal-animated.png'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">{children}</h2>
}

function SubsectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{children}</h3>
}

function FigureCaption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-gray-600 italic mb-4 pl-4 border-l-2 border-gray-200">
      {children}
    </p>
  )
}

function Figure({
  src,
  alt,
  caption,
}: {
  src: string
  alt: string
  caption: React.ReactNode
}) {
  return (
    <figure className="my-6">
      <img
        src={src}
        alt={alt}
        className="w-full rounded-lg border border-gray-200"
      />
      <FigureCaption>{caption}</FigureCaption>
    </figure>
  )
}

function AboutPage() {
  const egoFocusUrl =
    'https://nickmarcha.github.io/INF358_Project_Kriskogram/explorer?view=kriskogram&minThreshold=1&maxThreshold=107546&maxEdges=35&showAllNodes=true&dataset=csv-usa-pre-2020&year=2021&egoNodeId=CALIFORNIA&egoNeighborSteps=1&edgeWeightScale=linear&egoStepColoring=false&staticNeighborYears=0&temporalOverlay=false&temporalOverlayYears=1&temporalOverlaySegmented=false&temporalOverlayStyle=outline&temporalOverlayEdgeStyle=filled&temporalOverlayNodeStyle=filled&edgeSegmentLength=8&edgeSegmentGap=4&edgeSegmentOffset=15&edgeSegmentCap=round&edgeSegmentAnimate=false&edgeOutlineGap=3&edgeOutlineThickness=3&nodeOrderMode=region&arcOpacity=0.85&edgeWidthMode=weight&edgeColorAdvanced=false&edgeColorHue=single&edgeColorHueAttribute=null&edgeColorIntensity=weight&edgeColorIntensityAttribute=null&edgeColorIntensityConst=0.6&edgeColorInterGrayscale=true&intraFilter=none&baseEdgeWidth=2&nodeColorMode=attribute&nodeColorAttribute=region&nodeSizeMode=fixed&nodeSizeAttribute=null&interactionMode=pan&lensRadius=80&edgeSegmentSpeed=1&edgeSegmentScaleByWeight=false&nodeFilterAttribute=region&nodeFilterValue=West&nodeFilterValues=%5B%22West%22%5D&temporalOverlayYearsPast=1&temporalOverlayYearsFuture=1&temporalOverlayColorPast=%23fc8d59&temporalOverlayColorMid=%23ffffbf&temporalOverlayColorFuture=%2391bfdb&temporalOverlayCurrentBlack=true&edgeWidthMultiplier=1&nodeSizeWeightScale=linear&nodeSizeMultiplier=1&egoNodeSecondaryId=null&labelScale=1.2'
  const temporalStaticUrl =
    'https://nickmarcha.github.io/INF358_Project_Kriskogram/explorer?view=kriskogram&minThreshold=1&maxThreshold=118552&maxEdges=20&edgeWeightScale=linear&edgeWidthMultiplier=3&egoNodeId=null&egoNeighborSteps=2&egoStepColoring=false&showAllNodes=true&temporalOverlay=true&temporalOverlayEdgeStyle=filled&temporalOverlayNodeStyle=filled&temporalOverlayYearsPast=3&temporalOverlayYearsFuture=0&temporalOverlayColorPast=%23f7fcb9&temporalOverlayColorMid=%2331a354&temporalOverlayColorFuture=%2391bfdb&temporalOverlayCurrentBlack=false&nodeOrderMode=alphabetical&arcOpacity=0.85&edgeWidthMode=weight&edgeColorAdvanced=true&edgeColorHue=single&edgeColorHueAttribute=null&edgeColorIntensity=weight&edgeColorIntensityAttribute=null&edgeColorIntensityConst=0.6&edgeColorInterGrayscale=true&intraFilter=none&baseEdgeWidth=2&nodeColorMode=net_year&nodeColorAttribute=null&nodeSizeMode=visible_incoming&nodeSizeAttribute=null&nodeSizeWeightScale=linear&nodeSizeMultiplier=1&interactionMode=pan&lensRadius=80&edgeSegmentLength=8&edgeSegmentGap=17&edgeSegmentAnimate=false&edgeSegmentOffset=15&edgeSegmentSpeed=1&edgeSegmentScaleByWeight=true&edgeSegmentCap=butt&edgeOutlineGap=3&nodeFilterAttribute=region&nodeFilterValues=%5B%22West%22%5D&dataset=csv-usa-pre-2020&year=2008&labelScale=1.8&egoNodeSecondaryId=null'
  const temporalAnimatedUrl =
    'https://nickmarcha.github.io/INF358_Project_Kriskogram/explorer?view=kriskogram&minThreshold=1&maxThreshold=118552&maxEdges=20&edgeWeightScale=linear&edgeWidthMultiplier=3&egoNodeId=null&egoNeighborSteps=2&egoStepColoring=false&showAllNodes=true&temporalOverlay=true&temporalOverlayEdgeStyle=segmented&temporalOverlayNodeStyle=filled&temporalOverlayYearsPast=3&temporalOverlayYearsFuture=0&temporalOverlayColorPast=%23f7fcb9&temporalOverlayColorMid=%2331a354&temporalOverlayColorFuture=%2391bfdb&temporalOverlayCurrentBlack=false&nodeOrderMode=alphabetical&arcOpacity=0.85&edgeWidthMode=weight&edgeColorAdvanced=true&edgeColorHue=single&edgeColorHueAttribute=null&edgeColorIntensity=weight&edgeColorIntensityAttribute=null&edgeColorIntensityConst=0.6&edgeColorInterGrayscale=true&intraFilter=none&baseEdgeWidth=2&nodeColorMode=net_year&nodeColorAttribute=null&nodeSizeMode=visible_incoming&nodeSizeAttribute=null&nodeSizeWeightScale=linear&nodeSizeMultiplier=1&interactionMode=pan&lensRadius=80&edgeSegmentLength=8&edgeSegmentGap=17&edgeSegmentAnimate=true&edgeSegmentOffset=15&edgeSegmentSpeed=1&edgeSegmentScaleByWeight=true&edgeSegmentCap=butt&edgeOutlineGap=3&nodeFilterAttribute=region&nodeFilterValues=%5B%22West%22%5D&dataset=csv-usa-pre-2020&year=2008&labelScale=1.8&egoNodeSecondaryId=null'

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 md:p-10">
          <header className="mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Exploring Interactive Kriskograms
            </h1>
            <p className="text-gray-700">Nicolas M Mjøs · University of Bergen</p>
          </header>

          <SectionHeading>Introduction</SectionHeading>
          <p className="text-gray-800 mb-4">
            Traditional flow maps struggle to effectively convey human migration patterns. When
            migration flows are overlaid on geographic maps, several inherent problems emerge: edges
            may stretch across the map with lengths unrelated to flow magnitude, spatial layouts
            obscure underlying patterns, and overlapping edges create visual clutter that only
            worsens at scale (see Figure 1). These limitations become particularly problematic when
            analyzing complex migration systems with multiple sources, sinks, and temporal dynamics.
          </p>
          <Figure
            src={graserGull}
            alt="Gull migration visualization showing edge bundling"
            caption={
              <>
                Gull migration visualization showing edge bundling to address visual clutter in flow
                maps. Point-based flows where each edge represents one bird's movement: (a) original
                GPS trajectories converted to OD flows and (b) bundled edges with compatibility
                threshold. Adapted from Graser et al.{' '}
                <a href="#ref-8" className="text-blue-700 underline">
                  (2017)
                </a>
                .
              </>
            }
          />
          <p className="text-gray-800 mb-4">
            In 2009, Xiao and Chun{' '}
            <a href="#ref-1" className="text-blue-700 underline">
              (2009)
            </a>{' '}
            introduced kriskograms as an alternative approach. Rather than constraining flows to
            geographic space, they proposed an abstract representation in which nodes are arranged
            along a horizontal axis with equal spacing, ordered by demographic or geographic
            variables. Migration flows appear as semicircular arcs: arcs above the axis indicate one
            direction, arcs below indicate the opposite direction, and arc width encodes flow
            magnitude. This design prioritizes pattern revelation and eliminates many of the
            aforementioned problems of spatial flow maps by removing geographic constraints
            altogether.
          </p>
          <Figure
            src={originalKriskogram}
            alt="Original kriskogram depicting interstate migration"
            caption={
              <>
                Original kriskogram depicting interstate migration in conterminous U.S. Arranged
                according to longitude, smaller migration flows not shown.{' '}
                <a href="#ref-1" className="text-blue-700 underline">
                  (Xiao & Chun, 2009)
                </a>
                .
              </>
            }
          />
          <p className="text-gray-800 mb-4">
            Unlike other abstract flow visualizations adapted from other domains, kriskograms were
            purpose-built for migration patterns. They handle bidirectional flows naturally: the
            above/below encoding makes direction immediately apparent without arrowheads, and both
            directions between any pair of entities remain visible simultaneously without entity
            duplication. The fixed horizontal layout avoids mental rotation issues while the
            ordered arrangement along a meaningful axis (e.g., geographic position, population
            size) enables pattern recognition in relation to that ordering variable, revealing
            whether migration concentrates among populous regions, follows geographic proximity, or
            exhibits other systematic relationships.
          </p>
          <p className="text-gray-800 mb-4">
            Despite these advantages, kriskograms have seen limited adoption. A literature search
            yields few results, with most citations appearing in visualization-focused papers that
            list kriskograms as an example technique rather than applying them in substantive
            research. While they require some training to interpret, kriskograms offer a systematic
            way to identify migration patterns including sources, sinks, hubs, chains, and
            distinctions between regional and national flows. Modern interaction techniques have
            the potential to improve kriskogram usability and accessibility, yet interactive
            implementations remain largely unexplored.
          </p>
          <p className="text-gray-800 mb-4">
            In this work, I aim to explore and implement interactive features for kriskograms to
            better assess their potential for revealing migration dynamics. I focus on geospatial,
            directed, weighted, snapshot network data with the goal of supporting migration
            researchers in identifying key patterns and trends. By developing an interactive web
            application and exploring novel interaction techniques through a focused case study, I
            seek to demonstrate how interactive enhancements can support pattern recognition in
            migration data.
          </p>

          <SectionHeading>Related Work</SectionHeading>

          <SubsectionHeading>Abstract Flow Visualizations</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Beyond geographic flow maps, researchers have developed various abstract representations
            that prioritize pattern revelation over spatial fidelity. Gutwin et al.{' '}
            <a href="#ref-12" className="text-blue-700 underline">
              (2023)
            </a>{' '}
            compared chord and Sankey diagrams for flow visualization, finding that chord diagrams
            require more time and mental effort to interpret due to radial layout challenges: mental
            rotation requirements, ambiguous link direction, and problematic bidirectional flows.
            While Sankey diagrams perform better, they struggle with bidirectional flows—the
            left-to-right paradigm assumes hierarchical structures, but migration systems require
            representing simultaneous sending and receiving. Additionally, Sankey diagrams do not
            inherently support temporal patterns or cyclical flows common in migration systems.
          </p>

          <SubsectionHeading>Kriskograms</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Kriskograms lack both empirical usability evaluation and exploration of interaction
            techniques. While chord and Sankey diagrams benefit from rich interactive
            implementations, kriskograms have remained primarily static visualizations. Since their
            introduction, kriskograms have seen limited applications: Zhao et al.{' '}
            <a href="#ref-4" className="text-blue-700 underline">
              (2015)
            </a>{' '}
            applied them in a public health context, and Demšar et al.{' '}
            <a href="#ref-3" className="text-blue-700 underline">
              (2021)
            </a>{' '}
            listed them alongside other flow visualization methods, but they remain less developed
            than established techniques.
          </p>

          <SubsectionHeading>Interaction Techniques</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            While interaction has proven valuable for geographic flow maps (
            <a href="#ref-13" className="text-blue-700 underline">
              Boyandin, 2019
            </a>
            ;{' '}
            <a href="#ref-8" className="text-blue-700 underline">
              Graser et al., 2017
            </a>
            ), kriskograms lack systematic exploration of interaction techniques. Schöttler et al.{' '}
            <a href="#ref-2" className="text-blue-700 underline">
              (2021)
            </a>{' '}
            identified interaction methods that could enhance abstract network visualizations like
            kriskograms, including Link Sliding and EdgeLens, but these remain unexplored in the
            kriskogram context. In the next section, I describe my solution and walk through a case
            study that demonstrates how interactive enhancements can support pattern recognition in
            migration data.
          </p>

          <SectionHeading>Solution and Methods</SectionHeading>
          <p className="text-gray-800 mb-4">
            To explore interactive kriskograms, I developed a static single-page application using
            React and Vite, with D3.js for rendering interactive diagrams. The implementation
            addresses three design goals: data persistence across browser refreshes, shareable visual
            configurations, and complete independence from external services once loaded.
          </p>

          <SubsectionHeading>Implementation</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            The application uses the browser IndexedDB API for persistent local data storage.
            TanStack Router manages validated search parameters that encode the current visual
            configuration, including data filtering, mark selection, and channel settings. This
            enables any view to be bookmarked or shared via URL. The application builds through
            GitHub Actions and deploys statically to GitHub Pages.
          </p>
          <p className="text-gray-800 mb-4">
            For visualization rendering, the application uses D3.js. While Sankey and Chord diagrams
            leverage existing D3 libraries (d3-sankey and d3-chord), kriskograms required
            implementation from primitives using D3's path and arc generators. This reflects the
            lack of mature tooling for kriskograms compared to more established flow visualization
            techniques.
          </p>

          <SubsectionHeading>Explorer View</SubsectionHeading>
          <Figure
            src={explorerImg}
            alt="The explorer view interface"
            caption="The explorer view interface. The left sidebar contains the datasets menu for importing data in CSV and GEXF formats, resetting data, and editing data descriptions. The center displays the current interactive visualization (Kriskogram, Table, Sankey, or Chord diagram). The right sidebar controls filtering, mark and channel selection, and visualization type switching."
          />
          <p className="text-gray-800 mb-4">
            The explorer view provides the main interface with three main areas: a datasets menu on
            the left, the visualization in the center, and controls on the right.
          </p>
          <p className="text-gray-800 mb-4">
            The interface supports comprehensive filtering (temporal, edge thresholds, node
            attributes, edge scope, maximum edges) to progressively refine views from broad
            patterns to specific relationships. Interactive tooltips display detailed edge and node
            information, including flow metrics and temporal summaries for multi-year data.
          </p>
          <p className="text-gray-800 mb-4">
            Kriskogram-specific settings include two features for pattern exploration: the
            Temporal Overlay and the Ego Focus. A pattern legend sidebar (accessible via the
            top-left button) displays patterns identified in the original kriskogram paper.
          </p>

          <SubsectionHeading>Ego Focus</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Ego Focus adapts ego network concepts from graph visualization. Users select a focus
            node and set neighbor steps (similar to k-neighbor graphs). Step 1 includes only edges
            touching the focus node. Step 2 includes edges touching the focus node or nodes one edge
            away, and so on. This enables pattern recognition centered on a single node.
          </p>

          <SubsectionHeading>Temporal Overlay</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Temporal Overlay renders multiple period kriskograms on top of each other. Static mode
            allows selecting years ahead and behind the current viewed year, with configurable color
            scales for past and future periods. All arcs render simultaneously, which can cause
            occlusion at larger scales but avoids multiple separate kriskograms.
          </p>
          <p className="text-gray-800 mb-4">
            Animated mode also overlays arcs but segments them and animates movement along flow
            direction. Segment speed can map to flow weight, enabling direct comparison of
            overlapping arcs through color-coded motion. Speed normalizes to arc length, allowing
            speed comparison across arcs of different lengths.
          </p>

          <SubsectionHeading>Sample Data</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            The primary dataset derives from the U.S. Census Bureau's State-to-State Migration
            Flows data{' '}
            <a href="#ref-census" className="text-blue-700 underline">
              (U.S. Census Bureau)
            </a>{' '}
            (2005-2019). Scripts convert published Excel worksheets into consistent CSV files, with
            state entries linked to the 4 Regions and 9 Divisions used by the U.S. Census Bureau
            for geographic classification to enable additional filtering options.
          </p>

          <SectionHeading>Case Study</SectionHeading>
          <p className="text-gray-800 mb-4">
            To demonstrate how interactive kriskograms support migration pattern analysis, I
            applied the visualization to U.S. Census state-to-state migration data (2005-2019).
            This case study explores three analytical scenarios: identifying node-centric migration
            patterns (sources, sinks, hubs), examining temporal flow evolution, and comparing flow
            magnitudes across time periods. Through these examples, I illustrate how the
            interactive features enable pattern recognition that would be difficult with static
            visualizations.
          </p>

          <SubsectionHeading>Exploring Node-Centric Patterns with Ego Focus</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            The Ego Focus feature enables targeted exploration of individual states' migration
            patterns. Figure 4 demonstrates this capability by focusing on California within the
            West region. Filtering to regional flows
            and setting the focus to California with one neighbor step isolates the state's direct
            migration connections, revealing its role as a migration source rather than a
            balanced hub. The visualization shows California's strongest outgoing connection to
            Arizona, followed by roughly half that magnitude to Nevada, Oregon, and Washington,
            with no particularly strong incoming flows. This pattern suggests California functions
            primarily as a source of out-migration within the region. By adjusting neighbor steps,
            users can progressively expand the view to include indirect connections, revealing
            multi-state migration chains that would be obscured in a full-network view.
          </p>
          <Figure
            src={egoFocusImg}
            alt="Ego Focus example showing West region states"
            caption={
              <>
                Ego Focus example showing West region states in 2005, with focus set to California
                at 1 neighbor step. Edge width and color saturation encode flow weights. This view
                isolates California's direct migration connections, revealing its role as a migration
                source with strong outgoing flows to Arizona, Nevada, Oregon, and Washington, but
                limited incoming flows. Interactive example:{' '}
                <a href={egoFocusUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  online
                </a>
                .
              </>
            }
          />

          <SubsectionHeading>Tracing Temporal Evolution</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Temporal overlay enables direct comparison of migration patterns across multiple years
            without switching between separate visualizations. Figure 5 shows static temporal overlay
            for West region states from 2005-2008, with distinct color scales distinguishing past and
            current periods. However, this approach faces challenges: color scaling and choices are
            difficult to optimize, and occlusion becomes problematic even with just a few years
            overlaid. While the view can reveal how migration flows change over time—some
            connections strengthen while others weaken—the visual complexity limits the number of
            years that can be meaningfully compared simultaneously.
          </p>
          <Figure
            src={temporalStaticImg}
            alt="Static temporal overlay for years 2005-2008"
            caption={
              <>
                Static temporal overlay for years 2005-2008. Multiple years render simultaneously
                with distinct color scales, showing temporal patterns through color-coded arcs. Color
                scaling and choices are difficult to optimize, and occlusion becomes problematic even
                with just a few years overlaid. Interactive example:{' '}
                <a href={temporalStaticUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  online
                </a>
                .
              </>
            }
          />
          <p className="text-gray-800 mb-4">
            Animated temporal overlay addresses occlusion by using motion to distinguish
            overlapping arcs. Figure 6 demonstrates this approach, with segmented arcs animating
            along flow direction at speeds proportional to flow weight. The motion enables users to
            compare flow magnitudes through both segment
            speed and edge width: faster-moving segments indicate stronger flows, while slower
            segments reveal weaker connections. This dual encoding proves particularly effective
            for comparing the same edge across time periods, as users can observe how segment
            speeds change while maintaining spatial reference through consistent node
            positioning. The animation also helps distinguish overlapping arcs that would be
            indistinguishable in static mode.
          </p>
          <Figure
            src={temporalAnimatedImg}
            alt="Animated temporal overlay for years 2005-2008"
            caption={
              <>
                Animated temporal overlay for years 2005-2008, inspired by FlowmapBlue{' '}
                <a href="#ref-13" className="text-blue-700 underline">
                  (Boyandin, 2019)
                </a>
                . Segmented arcs animate along flow direction, with speed mapped to flow weight. This
                enables comparison of flow magnitudes through both segment speed and edge width.
                Segment speeds facilitate comparison of the same edges across time periods, while
                edge width aids comparison between different edges. Interactive example:{' '}
                <a href={temporalAnimatedUrl} target="_blank" rel="noreferrer" className="text-blue-700 underline">
                  online
                </a>
                .
              </>
            }
          />

          <SectionHeading>Discussion</SectionHeading>
          <p className="text-gray-800 mb-4">
            The implementation demonstrates several strengths. Consistent node positioning provides
            stable reference points during interaction. Animated temporal overlay shows promise for
            revealing flow dynamics through motion, enabling comparison of flow magnitudes via
            segment speed and edge width simultaneously. This dual encoding proves particularly
            effective when comparing the same edges across time periods.
          </p>
          <p className="text-gray-800 mb-4">
            Several limitations emerged during development. Static direction encoding remains
            difficult to interpret intuitively; the above/below arc convention requires training
            that may limit accessibility. Scaling presents challenges: temporal overlay suffers
            from occlusion with more years, and the visualization struggles with large datasets
            where edge density overwhelms the layout. Node size and color encodings did not prove
            as effective as anticipated, suggesting that arc width remains the most reliable
            encoding for flow magnitude.
          </p>
          <p className="text-gray-800 mb-4">
            The temporal overlay static mode works less effectively than hoped, with occlusion
            limiting the number of years that can be meaningfully compared. Ego Focus mode was
            implemented with single-node focus, but the original concept involved tracing paths
            between two nodes, which remains unexplored. While interactive kriskograms address some
            limitations of static flow maps, they introduce new challenges (direction encoding,
            scaling) that must be balanced against their advantages. The case study demonstrates that
            interactive enhancements can support pattern recognition, but effectiveness depends on
            the specific analytical task and user expertise.
          </p>

          <SectionHeading>Further Work</SectionHeading>
          <p className="text-gray-800 mb-4">
            Several interaction techniques identified by Schöttler et al.{' '}
            <a href="#ref-2" className="text-blue-700 underline">
              (2021)
            </a>{' '}
            warrant further exploration. EdgeLens implementation proved challenging and was not
            completed. Link sliding, while identified as potentially valuable, was not prioritized
            in this implementation. Systematic evaluation of these techniques could reveal which
            interactions most effectively support kriskogram interpretation.
          </p>
          <p className="text-gray-800 mb-4">
            Comparative evaluation studies are needed to assess kriskogram effectiveness against
            established alternatives. Direct comparison with Sankey diagrams, chord diagrams, and
            flow maps using controlled tasks would quantify performance differences and identify
            contexts where kriskograms excel. Additionally, evaluating different kriskogram
            configurations against each other could reveal optimal design choices for specific
            analytical tasks.
          </p>
          <p className="text-gray-800 mb-4">
            Juxtaposition techniques could help address scaling limitations by presenting
            kriskograms alongside traditional geographic maps or flow maps, enabling users to
            leverage both abstract pattern recognition and spatial context. This approach might
            help users understand when to use each representation and could support comparing
            different filtering or ordering strategies.
          </p>

          <SectionHeading>Conclusions</SectionHeading>
          <p className="text-gray-800 mb-4">
            This work demonstrates that interactive kriskograms can support migration pattern
            analysis through novel interaction techniques. The implementation shows particular
            promise in animated temporal overlay, which uses motion to reveal flow dynamics and
            address occlusion challenges, and consistent node positioning, which provides stable
            reference points during exploration.
          </p>
          <p className="text-gray-800 mb-4">
            However, several fundamental challenges remain. The above/below directional encoding
            requires training that may limit accessibility. Scaling limitations affect both
            temporal comparison and dataset size, indicating that kriskograms may be best suited
            for focused analysis rather than comprehensive overviews. A key lesson is that
            abstract visualizations benefit significantly from interactive enhancements, but these
            must be carefully designed to address specific cognitive challenges. The animated
            temporal overlay's effectiveness suggests that motion can be a powerful perceptual
            channel for abstract flow visualizations.
          </p>
          <p className="text-gray-800 mb-4">
            The work contributes an open-source interactive implementation that makes kriskograms
            accessible for exploration and further research, addressing the gap in available
            tooling. Future empirical studies can build upon this foundation to quantify
            kriskograms' effectiveness and identify optimal design choices for specific
            analytical contexts.
          </p>

          <SectionHeading>Acknowledgments</SectionHeading>
          <p className="text-gray-800 mb-4">
            Thanks to Ningchuan Xiao and Yongwan Chun for their original research, helpful
            responses, and encouragement, and to Roxanne Ziman for her guidance.
          </p>

          <SectionHeading>References</SectionHeading>
          <ol className="list-decimal ml-6 space-y-2 text-gray-800">
            <li id="ref-1">
              Xiao, N., & Chun, Y. (2009). Visualizing Migration Flows Using Kriskograms. Cartography
              and Geographic Information Science, 36(2), 183–191. doi:{' '}
              <a
                className="text-blue-700 underline"
                href="https://doi.org/10.1559/152304009788188763"
                target="_blank"
                rel="noreferrer"
              >
                10.1559/152304009788188763
              </a>
            </li>
            <li id="ref-2">
              Schöttler, S., Yang, Y., Pfister, H., & Bach, B. (2021). Visualizing and Interacting
              with Geospatial Networks: A Survey and Design Space. Computer Graphics Forum, 40(6),
              5–33. doi:{' '}
              <a
                className="text-blue-700 underline"
                href="https://doi.org/10.1111/cgf.14198"
                target="_blank"
                rel="noreferrer"
              >
                10.1111/cgf.14198
              </a>
            </li>
            <li id="ref-3">
              Demšar, U., Long, J. A., Benitez-Paez, F., Brum Bastos, V., Marion, S., Martin, G.,
              Sekulić, S., Smolak, K., Zein, B., & Siła-Nowicka, K. (2021). Establishing the
              integrated science of movement: bringing together concepts and methods from animal and
              human movement analysis. International Journal of Geographical Information Science,
              35(7), 1273–1308. doi:{' '}
              <a
                className="text-blue-700 underline"
                href="https://doi.org/10.1080/13658816.2021.1880589"
                target="_blank"
                rel="noreferrer"
              >
                10.1080/13658816.2021.1880589
              </a>
            </li>
            <li id="ref-4">
              Zhao, J., Exeter, D. J., Hanham, G., Lee, A. C. L., Browne, M., Grey, C., & Wells, S.
              (2015). Using integrated visualization techniques to investigate associations between
              cardiovascular health outcomes and residential migration in Auckland, New Zealand.
              Cartography and Geographic Information Science, 42(5), 381–397. doi:{' '}
              <a
                className="text-blue-700 underline"
                href="https://doi.org/10.1080/15230406.2015.1013567"
                target="_blank"
                rel="noreferrer"
              >
                10.1080/15230406.2015.1013567
              </a>
            </li>
            <li id="ref-8">
              Graser, A., Schmidt, J., Roth, F., & Brändle, N. (2017). Untangling origin-destination
              flows in geographic information systems. Information Visualization, 18(1), 153–172.
              doi:{' '}
              <a
                className="text-blue-700 underline"
                href="https://doi.org/10.1177/1473871617738122"
                target="_blank"
                rel="noreferrer"
              >
                10.1177/1473871617738122
              </a>
            </li>
            <li id="ref-12">
              Gutwin, C., Mairena, A., & Bandi, V. (2023). Showing Flow: Comparing Usability of
              Chord and Sankey Diagrams. In Proceedings of the 2023 CHI Conference on Human Factors
              in Computing Systems (CHI '23). ACM. doi:{' '}
              <a
                className="text-blue-700 underline"
                href="https://doi.org/10.1145/3544548.3581119"
                target="_blank"
                rel="noreferrer"
              >
                10.1145/3544548.3581119
              </a>
            </li>
            <li id="ref-13">
              Boyandin, I. (2019). FlowmapBlue: Flow Map Visualization Tool. GitHub.{' '}
              <a
                className="text-blue-700 underline"
                href="https://github.com/FlowmapBlue/FlowmapBlue"
                target="_blank"
                rel="noreferrer"
              >
                github.com/FlowmapBlue/FlowmapBlue
              </a>
            </li>
            <li id="ref-census">
              U.S. Census Bureau. State-to-State Migration Flows. U.S. Census Bureau.{' '}
              <a
                className="text-blue-700 underline"
                href="https://www.census.gov/data/tables/time-series/demo/geographic-mobility/state-to-state-migration.html"
                target="_blank"
                rel="noreferrer"
              >
                census.gov
              </a>
              . Data available from 2005 onward via the American Community Survey (ACS) and Puerto
              Rico Community Survey (PRCS).
            </li>
          </ol>

          <div className="mt-10">
            <Link to="/" className="text-blue-700 underline">
              ← Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
