<?php

namespace App\Entity;

use App\Repository\NiveauRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: NiveauRepository::class)]
class Niveau
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(type: 'integer')]
    private int $numero;

    #[ORM\Column(type: 'integer')]
    private int $faitsRencontres = 0;

    #[ORM\Column(type: 'integer')]
    private int $succes = 0;

    #[ORM\ManyToOne(inversedBy: 'niveaux')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Objectif $objectif = null;

    #[ORM\OneToMany(mappedBy: 'niveau', targetEntity: Tache::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $taches;

    public function __construct()
    {
        $this->taches = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getNumero(): int { return $this->numero; }
    public function setNumero(int $numero): self { $this->numero = $numero; return $this; }

    public function getFaitsRencontres(): int { return $this->faitsRencontres; }
    public function setFaitsRencontres(int $val): self { $this->faitsRencontres = $val; return $this; }

    public function getSucces(): int { return $this->succes; }
    public function setSucces(int $val): self { $this->succes = $val; return $this; }

    public function getObjectif(): ?Objectif { return $this->objectif; }
    public function setObjectif(?Objectif $objectif): self { $this->objectif = $objectif; return $this; }

    /** @return Collection<int, Tache> */
    public function getTaches(): Collection { return $this->taches; }
    public function addTache(Tache $tache): self {
        if (!$this->taches->contains($tache)) {
            $this->taches[] = $tache;
            $tache->setNiveau($this);
        }
        return $this;
    }
    public function removeTache(Tache $tache): self {
        if ($this->taches->removeElement($tache)) {
            if ($tache->getNiveau() === $this) {
                $tache->setNiveau(null);
            }
        }
        return $this;
    }
}
