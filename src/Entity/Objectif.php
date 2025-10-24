<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;

#[ORM\Entity]
class Objectif
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: "integer")]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $objID;

    #[ORM\Column(length: 255)]
    private string $name;

    #[ORM\ManyToOne(targetEntity: Entrainement::class, inversedBy: "objectifs")]
    #[ORM\JoinColumn(onDelete: "CASCADE")]
    private ?Entrainement $entrainement = null;

    /** @var Collection<int, Niveau> */
    #[ORM\OneToMany(mappedBy: "objectif", targetEntity: Niveau::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $niveaux;

    public function __construct()
    {
        $this->niveaux = new ArrayCollection();
    }

    // ----------- GETTERS / SETTERS -----------

    public function getId(): ?int { return $this->id; }

    public function getObjID(): string { return $this->objID; }
    public function setObjID(string $id): self { $this->objID = $id; return $this; }

    public function getName(): string { return $this->name; }
    public function setName(string $name): self { $this->name = $name; return $this; }

    public function getEntrainement(): ?Entrainement { return $this->entrainement; }
    public function setEntrainement(?Entrainement $entrainement): self { $this->entrainement = $entrainement; return $this; }

    /** @return Collection<int, Niveau> */
    public function getNiveaux(): Collection { return $this->niveaux; }

    public function addNiveau(Niveau $niveau): self
    {
        if (!$this->niveaux->contains($niveau)) {
            $this->niveaux->add($niveau);
            $niveau->setObjectif($this);
        }
        return $this;
    }

    public function removeNiveau(Niveau $niveau): self
    {
        if ($this->niveaux->removeElement($niveau)) {
            if ($niveau->getObjectif() === $this) {
                $niveau->setObjectif(null);
            }
        }
        return $this;
    }
}
