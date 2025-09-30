<?php

namespace App\Entity;

use App\Repository\ObjectifRepository;
use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: ObjectifRepository::class)]
class Objectif
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $titre;

    #[ORM\Column(type: 'json')]
    private array $tables = []; // ex: [2,3,4]

    #[ORM\ManyToOne(inversedBy: 'objectifs')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Eleve $eleve = null;

    #[ORM\OneToMany(mappedBy: 'objectif', targetEntity: Niveau::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $niveaux;

    public function __construct()
    {
        $this->niveaux = new ArrayCollection();
    }

    public function getId(): ?int { return $this->id; }
    public function getTitre(): string { return $this->titre; }
    public function setTitre(string $titre): self { $this->titre = $titre; return $this; }

    public function getTables(): array { return $this->tables; }
    public function setTables(array $tables): self { $this->tables = $tables; return $this; }

    public function getEleve(): ?Eleve { return $this->eleve; }
    public function setEleve(?Eleve $eleve): self { $this->eleve = $eleve; return $this; }

    /** @return Collection<int, Niveau> */
    public function getNiveaux(): Collection { return $this->niveaux; }
    public function addNiveau(Niveau $niveau): self {
        if (!$this->niveaux->contains($niveau)) {
            $this->niveaux[] = $niveau;
            $niveau->setObjectif($this);
        }
        return $this;
    }
    public function removeNiveau(Niveau $niveau): self {
        if ($this->niveaux->removeElement($niveau)) {
            if ($niveau->getObjectif() === $this) {
                $niveau->setObjectif(null);
            }
        }
        return $this;
    }
}
