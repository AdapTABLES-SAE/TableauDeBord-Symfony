<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity]
class Niveau
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $levelID;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $name = null;

    #[ORM\ManyToOne(targetEntity: Objectif::class, inversedBy: "niveaux")]
    #[ORM\JoinColumn(onDelete: "CASCADE", nullable: true)]
    private ?Objectif $objectif = null;

    /** @var Collection<int, Tache> */
    #[ORM\OneToMany(
        mappedBy: "niveau",
        targetEntity: Tache::class,
        cascade: ['persist', 'remove'],
        orphanRemoval: true
    )]
    private Collection $taches;

    // 🔹 anciens PCompletion + PConstruction
    #[ORM\Column(type: "float", nullable: true)]
    private ?float $successCompletionCriteria = null;

    #[ORM\Column(type: "float", nullable: true)]
    private ?float $encounterCompletionCriteria = null;

    #[ORM\Column(type: "json", nullable: true)]
    private ?array $tables = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $resultLocation = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $leftOperand = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $intervalMin = null;

    #[ORM\Column(type: "integer", nullable: true)]
    private ?int $intervalMax = null;

    public function __construct()
    {
        $this->taches = new ArrayCollection();
    }

    // ----------- GETTERS / SETTERS -----------

    public function getId(): ?int { return $this->id; }

    public function getLevelID(): string { return $this->levelID; }
    public function setLevelID(string $id): self { $this->levelID = $id; return $this; }

    public function getName(): ?string { return $this->name; }
    public function setName(?string $name): self { $this->name = $name; return $this; }

    public function getObjectif(): ?Objectif { return $this->objectif; }
    public function setObjectif(?Objectif $objectif): self { $this->objectif = $objectif; return $this; }

    /** @return Collection<int, Tache> */
    public function getTaches(): Collection { return $this->taches; }

    public function addTache(Tache $tache): self
    {
        if (!$this->taches->contains($tache)) {
            $this->taches->add($tache);
            $tache->setNiveau($this);
        }
        return $this;
    }

    public function removeTache(Tache $tache): self
    {
        if ($this->taches->removeElement($tache)) {
            if ($tache->getNiveau() === $this) {
                $tache->setNiveau(null);
            }
        }
        return $this;
    }

    // ---- anciens paramètres de complétion/construction ----

    public function getSuccessCompletionCriteria(): ?float { return $this->successCompletionCriteria; }
    public function setSuccessCompletionCriteria(?float $v): self { $this->successCompletionCriteria = $v; return $this; }

    public function getEncounterCompletionCriteria(): ?float { return $this->encounterCompletionCriteria; }
    public function setEncounterCompletionCriteria(?float $v): self { $this->encounterCompletionCriteria = $v; return $this; }

    public function getTables(): ?array { return $this->tables; }
    public function setTables(?array $t): self { $this->tables = $t; return $this; }

    public function getResultLocation(): ?string { return $this->resultLocation; }
    public function setResultLocation(?string $r): self { $this->resultLocation = $r; return $this; }

    public function getLeftOperand(): ?string { return $this->leftOperand; }
    public function setLeftOperand(?string $l): self { $this->leftOperand = $l; return $this; }

    public function getIntervalMin(): ?int { return $this->intervalMin; }
    public function setIntervalMin(?int $v): self { $this->intervalMin = $v; return $this; }

    public function getIntervalMax(): ?int { return $this->intervalMax; }
    public function setIntervalMax(?int $v): self { $this->intervalMax = $v; return $this; }
}
