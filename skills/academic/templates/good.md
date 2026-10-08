---
id: 8419cbed-7f41-5eac-a51a-a4c67a649656
type: semantic
created: '2026-06-30T10:00:00Z'
modified: '2026-06-30T10:00:00Z'
namespace: academic/information-retrieval
title: 'Retrieval Strategy and Evaluation in Retrieval-Augmented Generation: A Synthesis Report'
tags:
  - academic-report
  - retrieval-augmented-generation
  - information-retrieval
temporal:
  '@type': TemporalMetadata
  validFrom: '2026-06-30T00:00:00Z'
  recordedAt: '2026-06-30T10:00:00Z'
  ttl: P1Y
provenance:
  '@type': Provenance
  sourceType: user_explicit
  trustLevel: verified
  wasGeneratedBy:
    '@id': urn:mif:activity:rag-literature-synthesis-2026-06-30
    '@type': prov:Activity
citations:
  - '@type': Citation
    citationType: paper
    citationRole: supports
    title: 'Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks'
    url: https://arxiv.org/abs/2005.11401
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: paper
    citationRole: supports
    title: 'Dense Passage Retrieval for Open-Domain Question Answering'
    url: https://arxiv.org/abs/2004.04906
    accessed: '2026-06-26'
  - '@type': Citation
    citationType: paper
    citationRole: methodology
    title: 'RAGAS: Automated Evaluation of Retrieval Augmented Generation'
    url: https://arxiv.org/abs/2309.15217
    accessed: '2026-06-26'
relationships:
  - type: relates-to
    target: /semantic/google-design-doc/rag-pipeline-design.md
ontology:
  '@type': OntologyReference
  id: mif-docs
  version: 1.0.0
  uri: https://mif-spec.dev/ontologies/mif-docs
entity:
  name: 'Retrieval Strategy and Evaluation in Retrieval-Augmented Generation: A Synthesis Report'
  entity_type: academic-paper
---

# Retrieval Strategy and Evaluation in Retrieval-Augmented Generation: A Synthesis Report

## Abstract

Retrieval-augmented generation (RAG) couples a parametric language model with
a non-parametric retrieval component so that generation can be grounded in
retrieved evidence rather than relying solely on memorized weights. This
report synthesizes three lines of published research bearing on how such
systems retrieve and how their output is evaluated: the original RAG
architecture, dense passage retrieval as a retrieval-quality lever, and
reference-free evaluation of generated answers. Evidence was gathered from
peer-reviewed and widely-cited preprint sources and cross-checked against the
original publications rather than secondary summaries. The principal findings
are that (1) combining parametric and non-parametric memory improves
knowledge-intensive question answering over closed-book baselines, (2) dense
embedding-based retrieval outperforms sparse lexical retrieval on open-domain
question answering, and (3) automated, reference-free metrics can assess
faithfulness and relevance of generated answers without requiring
human-written ground-truth answers. We conclude that retrieval quality and
evaluation methodology are both first-class design concerns for RAG systems,
not afterthoughts to the generator itself.

## Background / Related Context

Prior to retrieval augmentation, large language models were typically
evaluated in a closed-book setting: all knowledge had to be encoded in model
parameters at training time, with no mechanism to incorporate new or
long-tail facts at inference time. This creates two well-known gaps: factual
knowledge goes stale as the world changes, and rare or specific facts are
under-represented during training. The gap this report addresses is how
retrieval and evaluation choices interact to determine whether a RAG system's
answers are both accurate and verifiably grounded in the retrieved evidence.

## Method

Evidence for this report was gathered from three primary-source publications
identified as foundational and widely cited in the retrieval-augmented
generation literature, and verified by reading the original papers directly
rather than relying on downstream citations of them. No claim in the Findings
section is included without a direct citation to its originating publication.
Where a publication's own reported results are the basis for a claim, that
result is described qualitatively rather than restated as a universally
generalizable number, since benchmark conditions vary across papers.

## Findings

### Retrieval-augmented generation as an architecture

Lewis et al. (2020) introduced retrieval-augmented generation as a general
architecture that combines a pre-trained parametric sequence-to-sequence
model with a non-parametric dense vector index of a large text corpus,
retrieved via a neural retriever and consumed by the generator at both
training and inference time. On knowledge-intensive NLP tasks including
open-domain question answering, the paper reports that this hybrid approach
outperformed both purely parametric (closed-book) and purely
extractive/retrieval-only baselines evaluated in the same study (Lewis et
al., 2020).

### Dense retrieval as a quality lever

Karpukhin et al. (2020) showed that a dense retriever trained with a dual
BERT-based encoder — one encoder for questions, one for passages, matched by
inner product — can outperform traditional sparse lexical retrieval methods
such as TF-IDF/BM25 on open-domain question-answering benchmarks, without
requiring more than a modest number of question-passage training pairs. This
result establishes retrieval architecture itself, not only the generator, as
a lever on end-to-end answer quality (Karpukhin et al., 2020).

### Reference-free evaluation of generated answers

Es et al. (2023) proposed RAGAS, a framework for evaluating
retrieval-augmented generation pipelines without requiring human-annotated
ground-truth answers. RAGAS decomposes evaluation into component metrics —
including faithfulness of the generated answer to the retrieved context, and
relevance of the retrieved context and the answer to the original question —
that can be computed automatically. This addresses a practical bottleneck:
end-to-end human evaluation of RAG systems does not scale with the pace of
system iteration (Es et al., 2023).

## Discussion

These three findings interact: retrieval quality (Karpukhin et al., 2020)
sets an upper bound on what a RAG generator (Lewis et al., 2020) can
faithfully ground its answer in, and evaluation methodology (Es et al., 2023)
determines whether that faithfulness is actually measured rather than
assumed. A system that retrieves poorly, but is evaluated only on final
answer correctness against a small gold set, can appear to perform
acceptably while still hallucinating content not supported by its retrieved
context.

**Limitations.** This report synthesizes three papers rather than running a
new empirical comparison; it does not itself establish which retrieval
method or evaluation metric is best on any particular corpus, only that these
concerns are established and consequential in the literature. The papers
cited were evaluated on their own benchmarks under their own conditions, and
results are not necessarily transferable to arbitrary production corpora or
domains outside those benchmarks. Newer retrieval and evaluation methods have
continued to be published since 2023 and are out of scope for this report.

## References

Es, S., James, J., Espinosa-Anke, L., & Schockaert, S. (2023). RAGAS:
Automated Evaluation of Retrieval Augmented Generation.
<https://arxiv.org/abs/2309.15217>

Karpukhin, V., Oğuz, B., Min, S., Lewis, P., Wu, L., Edunov, S., Chen, D., &
Yih, W. (2020). Dense Passage Retrieval for Open-Domain Question Answering.
<https://arxiv.org/abs/2004.04906>

Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N.,
Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., & Kiela, D.
(2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks.
<https://arxiv.org/abs/2005.11401>
