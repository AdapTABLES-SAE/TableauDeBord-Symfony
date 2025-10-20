<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
class Niveau
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $levelID;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\ManyToOne(targetEntity: Objectif::class, inversedBy: "niveaux")]
    private ?Objectif $objectif = null;

    #[ORM\OneToMany(mappedBy: "niveau", targetEntity: PNiveau::class)]
    private iterable $pniveaux;

    #[ORM\OneToMany(mappedBy: "niveau", targetEntity: PTache::class)]
    private iterable $ptaches;

    // ----------------------------------------------------
    // Getters / Setters
    // ----------------------------------------------------

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getLevelID(): string
    {
        return $this->levelID;
    }

    public function setLevelID(string $levelID): self
    {
        $this->levelID = $levelID;
        return $this;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name): self
    {
        $this->name = $name;
        return $this;
    }

    public function getObjectif(): ?Objectif
    {
        return $this->objectif;
    }

    public function setObjectif(?Objectif $objectif): self
    {
        $this->objectif = $objectif;
        return $this;
    }

    public function getPniveaux(): iterable
    {
        return $this->pniveaux;
    }

    public function addPniveau(PNiveau $pniveau): self
    {
        $this->pniveaux[] = $pniveau;
        return $this;
    }

    public function removePniveau(PNiveau $pniveau): self
    {
        $this->pniveaux = array_filter($this->pniveaux, fn($p) => $p !== $pniveau);
        return $this;
    }

    public function getPtaches(): iterable
    {
        return $this->ptaches;
    }

    public function addPtache(PTache $ptache): self
    {
        $this->ptaches[] = $ptache;
        return $this;
    }

    public function removePtache(PTache $ptache): self
    {
        $this->ptaches = array_filter($this->ptaches, fn($t) => $t !== $ptache);
        return $this;
    }
}
