"""Weißsaum-Korrektur: Innenzeichnung und Geometrie bleiben, nur Randdeckung wird reduziert."""
import sys
sys.dont_write_bytecode = True
import importlib.util
from pathlib import Path
import unittest
import numpy as np
from PIL import Image, ImageDraw
spec=importlib.util.spec_from_file_location('bilder',Path(__file__).parents[1]/'tools/landschaft-bilder.py')
bilder=importlib.util.module_from_spec(spec);spec.loader.exec_module(bilder)
class MatteTest(unittest.TestCase):
 def test_fringe_only(self):
  image=Image.new('RGBA',(40,30),(0,0,0,0));draw=ImageDraw.Draw(image)
  draw.rectangle((4,4,35,25),fill=(240,238,230,170))
  draw.rectangle((6,6,33,23),fill=(100,70,45,255))
  draw.rectangle((13,11,26,18),fill=(251,250,248,255)) # heller Vogelbauch bleibt deckend
  before=np.array(image);after=np.array(bilder.remove_white_fringe(image))
  self.assertEqual(image.size,bilder.remove_white_fringe(image).size)
  np.testing.assert_array_equal(before[11:19,13:27],after[11:19,13:27])
  self.assertTrue(np.all(after[:,:,3]<=before[:,:,3]))
  self.assertLess(after[4,4,3],30)
  self.assertEqual(int(after[4,4,:3].min()),0)
  np.testing.assert_array_equal(before[:4],after[:4])
 def test_export_budget_and_registration(self):
  assets=Path(__file__).parents[1]/'assets'
  birds=[n for n in bilder.ORIGINALS if n!='ast.webp']
  self.assertLessEqual(sum((assets/n).stat().st_size for n in birds),600000)
  for name in birds:
   with Image.open(assets/name) as current, Image.open(assets/'bestand'/name) as original:
    self.assertEqual(current.size,original.size)
    self.assertEqual(current.mode,'RGBA')
  with Image.open(assets/'ast.webp') as branch:
   self.assertEqual(branch.size,(2800,167))
if __name__=='__main__':unittest.main()
