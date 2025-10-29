import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: AboutPage,
})

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">{children}</h2>
}

function SubsectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xl font-semibold text-gray-900 mt-6 mb-3">{children}</h3>
}

function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto bg-white shadow-lg rounded-lg p-6 md:p-10">
          <header className="mb-8">
            <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
              Exploring Interactive Kriskograms
            </h1>
            <p className="text-gray-700">Nick Marcha · University of Bergen</p>
          </header>

          <SectionHeading>Introduction</SectionHeading>
          <p className="text-gray-800 mb-4">
            Traditional flow maps struggle to convey migration patterns: edge lengths are not
            related to flow magnitude, spatial layouts can obscure underlying structure, and
            overlapping edges create clutter that worsens at scale. These issues are acute in
            complex migration systems with multiple sources, sinks, and temporal dynamics.
          </p>
          <p className="text-gray-800 mb-4">
            In 2009, Xiao and Chun <a href="#ref-1" className="text-blue-700 underline">(2009)</a> introduced kriskograms as an alternative approach. Rather than constraining flows to geographic space, they proposed an abstract representation that prioritizes pattern revelation. Kriskograms arrange all nodes along a horizontal axis with equal spacing, ordered by demographic or geographic variables. Migration flows appear as semicircular arcs, arcs above the axis indicate one direction, arcs below indicate the opposite direction, and arc width encodes flow magnitude. This design eliminates many problems of spatial flow maps by removing geographic constraints altogether.
          </p>
          <p className="text-gray-800 mb-4">
            Despite advantages, kriskograms are underused. They require some training and lack
            widely available interactive implementations. This work explores interactive features
            for kriskograms to assess their potential for revealing migration dynamics in geospatial,
            directed, weighted, snapshot network data.
          </p>

          <SectionHeading>Related Work</SectionHeading>

          <SubsectionHeading>Abstract Migration Visualizations</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Abstract representations trade spatial context for reduced clutter and emphasis on
            system structure—often valuable for migration analysis where spatial layouts can hide
            patterns.
          </p>

          <SubsectionHeading>Chord Diagrams: Radial Layout Challenges</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Chord diagrams arrange entities around a circular axis and represent flows as ribbons connecting them across the circle's interior. Although chord diagrams have gained popularity in mainstream media and research communication, appearing in tools such as D3, R, PowerBI, and Bokeh, recent empirical evidence reveals significant usability limitations for flow interpretation.
          </p>
          <p className="text-gray-800 mb-4">
            Gutwin et al. <a href="#ref-12" className="text-blue-700 underline">(2023)</a> conducted a controlled comparison of chord and sankey diagrams for flow visualization tasks, finding substantial performance differences. Participants took 3.7 seconds longer per question when interpreting chord diagrams compared to sankey diagrams, with this difference increasing to 9.2 seconds for first encounters with each type of question. The error rates were also higher with chord diagrams (0.1 more errors per question on average, 0.42 more errors in the first iteration). Participants reported higher mental effort, increased frustration, and reduced perceived performance with chord diagrams, with 42 of 51 participants preferring sankey diagrams overall.
          </p>
          <p className="text-gray-800 mb-4">
            The study identified several specific issues with chord diagrams' radial layout. First, the circular organization requires mental rotation to interpret entities at non-horizontal orientations, introducing cognitive overhead that compounds with interpretation time. Second, link direction becomes difficult to determine; while Sankeys's left-to-right organization provides implicit directionality, chord diagrams require users to locate and interpret small arrowheads embedded in ribbons, particularly challenging for narrow flows. Third, participants found it harder to visually trace connections through the circle's center, where ribbon width dynamically changes and multiple flows converge. Finally, for bidirectional migration data where entities serve as both sources and destinations, chord diagrams group incoming and outgoing flows at the same node, requiring additional cognitive effort to visually separate directions.
          </p>
          <p className="text-gray-800 mb-4">
            These limitations prove particularly problematic for migration visualization, where understanding bidirectional flows and identifying sources versus sinks constitute fundamental analytical tasks.
          </p>

          <SubsectionHeading>Sankey Diagrams: Directionality Constraints</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Sankey diagrams use a left-to-right layout with entities positioned on vertical axes and flows represented as streams with width proportional to magnitude. While Gutwin et al.'s study <a href="#ref-12" className="text-blue-700 underline">(2023)</a> demonstrated clear usability advantages for sankey diagrams over chord diagrams, sankey representations face inherent constraints for migration data.
          </p>
          <p className="text-gray-800 mb-4">
            Most critically, sankey diagrams struggle with bidirectional flows. The left-to-right paradigm assumes a hierarchical or unidirectional flow structure where entities can be cleanly partitioned into sources (left) and destinations (right). Migration systems, however, rarely exhibit such clear directionality—most regions simultaneously send and receive migrants. Representing bidirectional flows in sankey diagrams requires either duplicating entities on both axes (creating redundancy and increasing visual complexity) or forcing asymmetric flows into a single direction (losing information about reverse flows).
          </p>
          <p className="text-gray-800 mb-4">
            Additionally, sankey diagrams do not inherently support temporal patterns or cyclical flows common in migration systems. The linear layout suggests a sequential progression rather than the ongoing, reciprocal nature of migration exchanges. While sankey diagrams excel at showing hierarchical flows like energy transfer or budget allocation, these strengths do not transfer directly to migration's bidirectional, network-like structure.
          </p>

          <SubsectionHeading>Kriskograms: Design for Migration Patterns</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Kriskograms <a href="#ref-1" className="text-blue-700 underline">(Xiao & Chun, 2009)</a> emerged specifically to address limitations in migration visualization. Unlike chord and sankey diagrams, which adapt general-purpose flow visualization approaches, kriskograms were designed from the first principles around requirements to reveal migration patterns.
          </p>
          <p className="text-gray-800 mb-4">
            The kriskogram technique arranges all entities along a horizontal line with equal spacing, ordered by demographic or geographic variables. Migration flows appear as semicircular arcs, with directionality encoded by position relative to the axis arcs above indicate one direction, arcs below indicate the opposite direction and magnitude encoded by arc width. This design directly addresses several weaknesses in both chord and sankey approaches.
          </p>
          <p className="text-gray-800 mb-4">
            First, kriskograms handle bidirectional flows naturally. The above/below encoding makes direction immediately apparent without requiring arrowheads or careful visual tracing, and both directions between any pair of entities remain visible simultaneously without entity duplication. Second, the fixed horizontal layout with equal spacing avoids the mental rotation issues of chord diagrams while maintaining visual clarity that chord's radial compression compromises. Third, the ordered arrangement along a meaningful axis (e.g., geographic position, population size) enables pattern recognition in relation to that ordering variable researchers can immediately observe whether migration concentrates among populous regions, follows geographic proximity, or exhibits other systematic relationships.
          </p>
          <p className="text-gray-800 mb-4">
            Xiao and Chun <a href="#ref-1" className="text-blue-700 underline">(2009)</a> demonstrated kriskograms' ability to reveal migration patterns including sources, sinks, hubs (entities serving as both origin and destination), chains (sequential migration paths), and regional versus national flow systems. However, kriskograms' adoption has remained limited, possibly due to the learning curve required to interpret the above/below directional encoding and the lack of interactive implementations that could reduce this barrier.
          </p>

          <SubsectionHeading>Comparative Positioning</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            The empirical evidence from Gutwin et al. <a href="#ref-12" className="text-blue-700 underline">(2023)</a> establishes that even among popular abstract flow visualizations, there are significant usability differences. The aesthetic appeal of chord diagrams comes at substantial cognitive cost, particularly for users' first encounters with visualizations, precisely the scenario for public-facing migration visualizations or exploratory analysis. Sankey diagrams provide clearer interpretation but their structural assumptions mismatch migration data's bidirectional nature.
          </p>
          <p className="text-gray-800 mb-4">
            Kriskograms occupy a distinct position in this design space: purpose-built for migration patterns, explicitly supporting bidirectionality, and offering systematic ordering to support pattern recognition. Yet, unlike chord and sankey diagrams, kriskograms lack both empirical usability evaluation and exploration of how interaction techniques might enhance their effectiveness. While chord and sankey diagrams benefit from rich interactive implementations (hover highlighting, filtering, animation), kriskograms have remained primarily static visualizations, potentially limiting their accessibility and analytical power.
          </p>

          <SubsectionHeading>Kriskogram Applications and Extensions</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Since their introduction, kriskograms have seen limited applications. Zhao et al. <a href="#ref-4" className="text-blue-700 underline">(2015)</a> applied kriskograms in a public health context to study residential migration and cardiovascular outcomes in Auckland, New Zealand. While their implementation suffered from some redundancy in visual channels, they contributed potentially useful extensions including the representation of within-node movement as overlapping circles to show the ratio between stationary and non-stationary populations.
          </p>
          <p className="text-gray-800 mb-4">
            Demšar et al. <a href="#ref-3" className="text-blue-700 underline">(2021)</a> listed kriskograms among various movement visualization techniques in their comprehensive review of movement analysis across animal and human mobility research. This inclusion reflects interest from the geographic information science community, though kriskograms appear as one option among many rather than receiving focused analysis.
          </p>

          <SubsectionHeading>Interaction Techniques for Geospatial Networks</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Schöttler et al. <a href="#ref-2" className="text-blue-700 underline">(2021)</a> provided a comprehensive taxonomy of geospatial network visualizations and interaction techniques. Their survey identified interaction methods that could potentially enhance abstract network visualizations like kriskograms. Specifically, they noted that Link Sliding—allowing users to navigate from node to node by hovering to highlight nearby edges—and EdgeLens—warping overlapping arcs around a focal point to reduce clutter—could benefit kriskogram designs. However, these interaction paradigms have not been systematically explored in the kriskogram context.
          </p>

          <SubsectionHeading>Contemporary Flow Map Approaches</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            Conventional flow mapping continues to evolve while maintaining geographic representation. Graser et al. <a href="#ref-8" className="text-blue-700 underline">(2017)</a> developed techniques for untangling origin-destination flows in GIS environments, introducing edge clustering methods that aggregate flows to reduce visual complexity while preserving directional information through color-coded endpoints. Their approach allows edges to converge and diverge rather than following straight lines, keeping the underlying flows visible while reducing occlusion.
          </p>
          <p className="text-gray-800 mb-4">
            Boyandin's FlowmapBlue <a href="#ref-13" className="text-blue-700 underline">(2019)</a> exemplifies modern interactive flow mapping with extensive features including animated flows. The animation represents flows as discrete objects moving between locations, providing an intuitive sense of migration dynamics while addressing occlusion through temporal separation. These conventional approaches prioritize spatial coherence over the abstract system structure that kriskograms emphasize.
          </p>

          <SubsectionHeading>Research Gap</SubsectionHeading>
          <p className="text-gray-800 mb-4">
            While interaction has proven valuable for geographic flow maps <a href="#ref-13" className="text-blue-700 underline">(Boyandin, 2019; Graser et al., 2017)</a>, we lack systematic exploration of interaction techniques specifically designed for abstract migration representations like kriskograms. I address this gap by implementing and evaluating interactive kriskograms through comparative case studies with existing visualization approaches, focusing on whether interactive enhancements can unlock their potential for revealing migration patterns.
          </p>

          <SectionHeading>Solution and Methods</SectionHeading>
          <p className="text-gray-800 mb-4">
            I will be creating a web app to explore and assess interactive kriskograms through a small case study, how well they meet key migration visualization requirements compared to interactive flow maps. I want to implement hovering, filtering, horizontal axis selection, coloring of edges and nodes.
          </p>
          <p className="text-gray-800 mb-4">
            I am starting with a React/Vite App using the D3 library to draw the kriskograms. It should support the importing of GEXF or some tabular format. After exploring functionality with a test dataset, I will start comparing to existing flow visualizations to see if I can glean additional insights from the same data. For example, FlowmapBlue <a href="#ref-13" className="text-blue-700 underline">(Boyandin, 2019)</a> has a number of interactive flow visualizations of public datasets that could be used for comparison.
          </p>

          <SectionHeading>Case Study</SectionHeading>
          <p className="text-gray-800 mb-4">TBD as implementation progresses.</p>

          <SectionHeading>Discussion</SectionHeading>
          <p className="text-gray-800 mb-4">TBD as comparative analysis develops.</p>

          <SectionHeading>Conclusions</SectionHeading>
          <p className="text-gray-800 mb-4">
            Interactive kriskograms show promise for revealing migration patterns beyond what
            spatial layouts can provide. As the implementation matures, we will prioritize practical
            interaction designs that improve accessibility and analytical power.
          </p>

          <SectionHeading>Acknowledgments</SectionHeading>
          <p className="text-gray-800 mb-4">
            Thanks to Ningchuan Xiao and Yongwan Chun for their original research and encouragement,
            and to Roxanne Ziman for guidance.
          </p>

          <SectionHeading>References</SectionHeading>
          <ol className="list-decimal ml-6 space-y-2 text-gray-800">
            <li id="ref-1">
              Xiao, N., & Chun, Y. (2009). Visualizing Migration Flows Using Kriskograms. Cartography
              and Geographic Information Science, 36(2), 183–191. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1559/152304009788188763" target="_blank" rel="noreferrer">10.1559/152304009788188763</a>
            </li>
            <li id="ref-2">
              Schöttler, S., Yang, Y., Pfister, H., & Bach, B. (2021). Visualizing and Interacting with
              Geospatial Networks: A Survey and Design Space. Computer Graphics Forum, 40(6), 5–33. doi:
              <a className="text-blue-700 underline" href="https://doi.org/10.1111/cgf.14198" target="_blank" rel="noreferrer">10.1111/cgf.14198</a>
            </li>
            <li id="ref-3">
              Demšar, U., et al. (2021). Establishing the integrated science of movement. International
              Journal of Geographical Information Science, 35(7), 1273–1308. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1080/13658816.2021.1880589" target="_blank" rel="noreferrer">10.1080/13658816.2021.1880589</a>
            </li>
            <li id="ref-4">
              Zhao, J., et al. (2015). Using integrated visualization techniques... Cartography and Geographic
              Information Science, 42(5), 381–397. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1080/15230406.2015.1013567" target="_blank" rel="noreferrer">10.1080/15230406.2015.1013567</a>
            </li>
            <li>
              Robertson, G., et al. (2008). Effectiveness of Animation in Trend Visualization. IEEE TVCG, 14(6),
              1325–1332. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1109/TVCG.2008.125" target="_blank" rel="noreferrer">10.1109/TVCG.2008.125</a>
            </li>
            <li>
              Harrower, M., & Fabrikant, S. (2008). The role of map animation in geographic visualization. Wiley.
              doi: <a className="text-blue-700 underline" href="https://doi.org/10.5167/UZH-8979" target="_blank" rel="noreferrer">10.5167/UZH-8979</a>
            </li>
            <li>
              Kim, K., Lee, S.-I., Shin, J., & Choi, E. (2012). Developing a Flow Mapping Module in a GIS Environment.
              The Cartographic Journal, 49(2), 164–175. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1179/174327711X13166800242356" target="_blank" rel="noreferrer">10.1179/174327711X13166800242356</a>
            </li>
            <li id="ref-8">
              Graser, A., et al. (2017). Untangling origin-destination flows in GIS. Information Visualization,
              18(1), 153–172. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1177/1473871617738122" target="_blank" rel="noreferrer">10.1177/1473871617738122</a>
            </li>
            <li>
              Wheeler, A. (2014). Visualization techniques for journey to crime flow data. Cartography and Geographic
              Information Science, 42(2), 149–161. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1080/15230406.2014.890545" target="_blank" rel="noreferrer">10.1080/15230406.2014.890545</a>
            </li>
            <li>
              Abel, G. J. (2020). Global migrant populations visualized using animated chord diagrams. GitHub. <a className="text-blue-700 underline" href="https://github.com/guyabel/personal-site/tree/main/content/post/global-migrant-chord-diagrams" target="_blank" rel="noreferrer">github.com/guyabel/...</a>
            </li>
            <li>
              Wang, K., et al. (2024). CHORDination: Evaluating Visual Design Choices in Chord Diagrams. VINCI 2024.
              doi: <a className="text-blue-700 underline" href="https://doi.org/10.1145/3678698.3678707" target="_blank" rel="noreferrer">10.1145/3678698.3678707</a>
            </li>
            <li id="ref-12">
              Gutwin, C., Mairena, A., & Bandi, V. (2023). Showing Flow: Comparing Usability of Chord and Sankey Diagrams.
              CHI '23. doi: <a className="text-blue-700 underline" href="https://doi.org/10.1145/3544548.3581119" target="_blank" rel="noreferrer">10.1145/3544548.3581119</a>
            </li>
            <li id="ref-13">
              Boyandin, I. (2019). FlowmapBlue: Flow Map Visualization Tool. GitHub. <a className="text-blue-700 underline" href="https://github.com/FlowmapBlue/FlowmapBlue" target="_blank" rel="noreferrer">github.com/FlowmapBlue/FlowmapBlue</a>
            </li>
            <li>
              Zapponi, C. (2014). peoplemovin. GitHub. <a className="text-blue-700 underline" href="https://github.com/littleark/peoplemovin" target="_blank" rel="noreferrer">github.com/littleark/peoplemovin</a>
            </li>
            <li>
              Abel, G. J., & Cohen, J. E. (2019). Bilateral international migration flow estimates for 200 countries.
              Scientific Data, 6(1). doi: <a className="text-blue-700 underline" href="https://doi.org/10.1038/s41597-019-0089-3" target="_blank" rel="noreferrer">10.1038/s41597-019-0089-3</a>
            </li>
          </ol>

          <div className="mt-10">
            <Link to="/" className="text-blue-700 underline">← Back to Home</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

