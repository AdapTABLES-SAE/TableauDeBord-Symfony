<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Tache
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private string $taskType;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $timeMaxSecond = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $repartitionPercent = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $successiveSuccessesToReach = null;

    #[ORM\Column(type: "json", nullable: true)]
    private ?array $targets = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $answerModality = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $nbIncorrectChoices = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $nbCorrectChoices = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $nbFacts = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $sourceVariation = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $target = null;

    #[ORM\ManyToOne(targetEntity: Niveau::class, inversedBy: "taches")]
    #[ORM\JoinColumn(onDelete: "CASCADE")]
    private ?Niveau $niveau = null;

    // ----------- GETTERS / SETTERS -----------

    public function getId(): ?int { return $this->id; }

    public function getTaskType(): string { return $this->taskType; }
    public function setTaskType(string $type): self { $this->taskType = $type; return $this; }

    public function getTimeMaxSecond(): ?int { return $this->timeMaxSecond; }
    public function setTimeMaxSecond(?int $t): self { $this->timeMaxSecond = $t; return $this; }

    public function getRepartitionPercent(): ?int { return $this->repartitionPercent; }
    public function setRepartitionPercent(?int $p): self { $this->repartitionPercent = $p; return $this; }

    public function getSuccessiveSuccessesToReach(): ?int { return $this->successiveSuccessesToReach; }
    public function setSuccessiveSuccessesToReach(?int $s): self { $this->successiveSuccessesToReach = $s; return $this; }

    public function getTargets(): ?array { return $this->targets; }
    public function setTargets(?array $targets): self { $this->targets = $targets; return $this; }

    public function getAnswerModality(): ?string { return $this->answerModality; }
    public function setAnswerModality(?string $m): self { $this->answerModality = $m; return $this; }

    public function getNbIncorrectChoices(): ?int { return $this->nbIncorrectChoices; }
    public function setNbIncorrectChoices(?int $n): self { $this->nbIncorrectChoices = $n; return $this; }

    public function getNbCorrectChoices(): ?int { return $this->nbCorrectChoices; }
    public function setNbCorrectChoices(?int $n): self { $this->nbCorrectChoices = $n; return $this; }

    public function getNbFacts(): ?int { return $this->nbFacts; }
    public function setNbFacts(?int $n): self { $this->nbFacts = $n; return $this; }

    public function getSourceVariation(): ?string { return $this->sourceVariation; }
    public function setSourceVariation(?string $s): self { $this->sourceVariation = $s; return $this; }

    public function getTarget(): ?string { return $this->target; }
    public function setTarget(?string $t): self { $this->target = $t; return $this; }

    public function getNiveau(): ?Niveau { return $this->niveau; }
    public function setNiveau(?Niveau $niveau): self { $this->niveau = $niveau; return $this; }
}
