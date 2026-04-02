namespace InControl.NativeProfile
{
	public class PowerASpectraIlluminatedControllerMacProfile : Xbox360DriverMacProfile
	{
		public PowerASpectraIlluminatedControllerMacProfile()
		{
			base.Name = "PowerA Spectra Illuminated Controller";
			base.Meta = "PowerA Spectra Illuminated Controller on Mac";
			Matchers = new NativeInputDeviceMatcher[1]
			{
				new NativeInputDeviceMatcher
				{
					VendorID = (ushort)9414,
					ProductID = (ushort)21546
				}
			};
		}
	}
}
